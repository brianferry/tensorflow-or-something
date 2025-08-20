/**
 * Pokemon Information Tool for TensorFlow.js Agent
 * 
 * Replicates the functionality of the LangChain PokemonInfoTool with caching,
 * connection pooling, and optimized API interactions.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

// Simple logger for serverless environment
const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

class PokemonTool {
    constructor() {
        this.name = 'pokemon_info';
        this.description = `
Useful for getting information about Pokemon. 
Input should be a Pokemon name or a question about Pokemon.
This tool can provide details about:
- Basic stats (height, weight, type, abilities)
- Evolution information
- Egg groups and breeding info
- Base stats and capture rates
- Pokemon descriptions

Examples of good inputs:
- "Pikachu"
- "Tell me about Charizard"
- "What are Bulbasaur's stats?"
- "Diglett evolution"
        `.trim();
        
        // Setup caching (memory only for serverless)
        this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
        
        // Setup HTTP client with connection pooling
        this.httpClient = axios.create({
            baseURL: 'https://pokeapi.co/api/v2',
            timeout: 10000,
            maxRedirects: 3,
            // Connection pooling configuration
            httpAgent: new (require('http').Agent)({ keepAlive: true, maxSockets: 10 }),
            httpsAgent: new (require('https').Agent)({ keepAlive: true, maxSockets: 10 })
        });
    }
    
    /**
     * Execute the tool with the given query
     */
    async execute(query, options = {}) {
        try {
            logger.info(`Pokemon tool executing query: ${query}`);
            
            // Check if we have ML-enhanced parameters from quality mode
            const mlParams = options.mlParams;
            let pokemonNames = [];
            
            if (mlParams && mlParams.pokemonNames.length > 0) {
                // Use ML-detected Pokemon names (may be multiple for comparisons)
                pokemonNames = [...new Set(mlParams.pokemonNames)]; // Remove duplicates
                logger.info(`Using ML-detected Pokemon names: ${pokemonNames.join(', ')}`);
            } else {
                // Fall back to traditional extraction
                const pokemonName = this._extractPokemonName(query);
                if (pokemonName) {
                    pokemonNames = [pokemonName];
                }
            }
            
            if (pokemonNames.length === 0) {
                return this._generateNoMatchResponse(query, options.performanceMode || 'balanced');
            }
            
            // Handle multiple Pokemon for competitive matchups
            if (pokemonNames.length > 1 && (mlParams?.focus === 'competitive' || /\b(versus|vs|against|matchup|compare)\b/.test(query.toLowerCase()))) {
                return await this._handleCompetitiveMatchup(pokemonNames, query, options, mlParams);
            }
            
            // Single Pokemon analysis
            const pokemonName = pokemonNames[0];
            // Get Pokemon information with ML-guided data fetching
            const pokemonInfo = await this._getPokemonInfo(pokemonName, mlParams);
            
            if (pokemonInfo.error) {
                return this._generateErrorResponse(pokemonName, pokemonInfo.error, options.performanceMode || 'balanced');
            }
            
            // Return raw data for the agent to process intelligently
            return {
                type: 'pokemon_data',
                query: query,
                pokemon: pokemonInfo,
                performanceMode: options.performanceMode || 'balanced',
                mlEnhanced: !!mlParams
            };
            
        } catch (error) {
            logger.error(`Pokemon tool error: ${error.message}`);
            return this._generateErrorResponse('unknown', error.message, options.performanceMode || 'balanced');
        }
    }
    
    /**
     * Generate response when no Pokemon match is found
     */
    _generateNoMatchResponse(query, performanceMode) {
        switch (performanceMode) {
            case 'fast':
                return "Please specify a Pokemon name (e.g. 'Pikachu', 'Charizard').";
            
            case 'quality':
                return `I've analyzed your query "${query}" but couldn't identify a specific Pokemon name to research. I'm designed to provide comprehensive Pokemon information including statistical analysis, evolutionary pathways, competitive insights, and detailed species data.\n\nTo help you effectively, please specify a Pokemon name such as:\n- Classic favorites: Pikachu, Charizard, Blastoise\n- Legendary Pokemon: Mewtwo, Articuno, Lugia\n- Any Pokemon from any generation\n\nI can then provide you with detailed analysis including base stats, type effectiveness, breeding information, and strategic competitive insights.`;
            
            default: // balanced
                return "I couldn't identify a specific Pokemon name in your query. Could you please specify which Pokemon you'd like to know about? For example, you could ask about 'Pikachu', 'Charizard', or any other Pokemon, and I'll provide you with detailed information about their stats, abilities, evolution, and more!";
        }
    }
    
    /**
     * Generate error response
     */
    _generateErrorResponse(pokemonName, error, performanceMode) {
        switch (performanceMode) {
            case 'fast':
                return `Couldn't find '${pokemonName}': ${error}`;
            
            case 'quality':
                return `I apologize, but I encountered a difficulty while researching ${pokemonName}. The specific error was: ${error}.\n\nThis could be due to:\n- A misspelled Pokemon name (please check the spelling)\n- A regional variant or form name that requires specific formatting\n- Temporary connectivity issues with the Pokemon database\n\nPlease verify the Pokemon name and try again. I'm here to provide comprehensive Pokemon analysis once we resolve this issue.`;
            
            default: // balanced
                return `Sorry, I couldn't find information about '${pokemonName}'. This might be due to a misspelling or if it's a very new Pokemon. Could you double-check the name and try again? I'm here to help with detailed Pokemon information!`;
        }
    }
    
    /**
     * Extract Pokemon name from the query using pattern matching
     */
    _extractPokemonName(query) {
        const queryLower = query.toLowerCase().trim();
        
        // If the query is just a pokemon name, return it
        if (queryLower.split(' ').length === 1) {
            return queryLower;
        }
        
        // Common Pokemon names for quick matching
        const commonPokemon = [
            'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'charmander',
            'blastoise', 'venusaur', 'caterpie', 'weedle', 'pidgey',
            'rattata', 'spearow', 'ekans', 'sandshrew', 'nidoran',
            'clefairy', 'vulpix', 'jigglypuff', 'zubat', 'oddish',
            'paras', 'venonat', 'diglett', 'meowth', 'psyduck',
            'mankey', 'growlithe', 'poliwag', 'abra', 'machop',
            'bellsprout', 'tentacool', 'geodude', 'ponyta', 'slowpoke',
            'magnemite', 'seel', 'grimer', 'shellder', 'gastly',
            'onix', 'drowzee', 'krabby', 'voltorb', 'exeggcute',
            'cubone', 'hitmonlee', 'hitmonchan', 'lickitung', 'koffing',
            'rhyhorn', 'chansey', 'tangela', 'kangaskhan', 'horsea',
            'goldeen', 'staryu', 'scyther', 'jynx', 'electabuzz',
            'magmar', 'pinsir', 'tauros', 'magikarp', 'gyarados',
            'lapras', 'ditto', 'eevee', 'vaporeon', 'jolteon',
            'flareon', 'porygon', 'omanyte', 'kabuto', 'aerodactyl',
            'snorlax', 'articuno', 'zapdos', 'moltres', 'dratini',
            'dragonair', 'dragonite', 'mewtwo', 'mew'
        ];
        
        // Check for direct Pokemon name matches
        for (const pokemon of commonPokemon) {
            if (queryLower.includes(pokemon)) {
                return pokemon;
            }
        }
        
        // Try to extract pokemon name using patterns
        const patterns = [
            /(?:about|info|information about|details about|stats for|data on)\s+([a-zA-Z]+)/,
            /pokemon\s+([a-zA-Z]+)/,
            /pokémon\s+([a-zA-Z]+)/,
            /^([a-zA-Z]+)(?:\s+pokemon|\s+pokémon|\s+stats|\s+evolution|\s+info)/,
            /([a-zA-Z]+)(?:'s|\s+stats|\s+abilities|\s+type)/,
            /does\s+([a-zA-Z]+)\s+(?:belong|evolve)/,
            /when\s+does\s+([a-zA-Z]+)\s+evolve/,
            /what\s+(?:egg\s+group\s+does\s+)?([a-zA-Z]+)/,
            /\b([a-zA-Z]+)\s+(?:belong\s+to|evolve|evolution)/,
            /tell\s+me\s+about\s+([a-zA-Z]+)/,
            /what\s+(is|are)\s+([a-zA-Z]+)/
        ];
        
        for (const pattern of patterns) {
            const match = queryLower.match(pattern);
            if (match) {
                const pokemonName = match[1] || match[2];
                // Filter out common words
                const excludedWords = new Set([
                    'the', 'what', 'how', 'where', 'when', 'why', 'is', 'are', 
                    'can', 'does', 'egg', 'group', 'pokemon', 'pokémon', 'info',
                    'about', 'stats', 'evolution', 'tell', 'me', 'good', 'best',
                    'first', 'last', 'some', 'any', 'all', 'type', 'types'
                ]);
                
                if (!excludedWords.has(pokemonName) && pokemonName.length > 2) {
                    return pokemonName;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Fetch comprehensive Pokemon information from PokeAPI with caching
     */
    async _getPokemonInfo(pokemonName) {
        const cacheKey = `pokemon_${pokemonName.toLowerCase()}`;
        
        // Check memory cache first
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            logger.info(`Returning cached data for ${pokemonName}`);
            return cachedData;
        }
        
        try {
            // Clean the pokemon name
            const cleanName = pokemonName.toLowerCase().trim().replace(/\s+/g, '-');
            
            logger.info(`Fetching Pokemon data for: ${cleanName}`);
            
            // Fetch basic pokemon data
            const pokemonResponse = await this.httpClient.get(`/pokemon/${cleanName}`);
            const pokemonData = pokemonResponse.data;
            
            // Extract basic information
            const info = {
                name: pokemonData.name.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' '),
                id: pokemonData.id,
                height: pokemonData.height / 10, // Convert to meters
                weight: pokemonData.weight / 10, // Convert to kg
                types: pokemonData.types.map(t => t.type.name),
                abilities: pokemonData.abilities.map(a => a.ability.name),
                base_stats: {},
                sprite: pokemonData.sprites.front_default
            };
            
            // Extract base stats
            for (const stat of pokemonData.stats) {
                info.base_stats[stat.stat.name] = stat.base_stat;
            }
            
            // Fetch species data for additional info
            try {
                const speciesResponse = await this.httpClient.get(pokemonData.species.url.replace('https://pokeapi.co/api/v2', ''));
                const speciesData = speciesResponse.data;
                
                // Get English description
                const flavorTexts = speciesData.flavor_text_entries || [];
                const englishFlavor = flavorTexts.find(entry => entry.language.name === 'en');
                info.description = englishFlavor ? 
                    englishFlavor.flavor_text.replace(/\n/g, ' ').replace(/\f/g, ' ') : 
                    'No description available';
                
                // Get egg groups
                info.egg_groups = (speciesData.egg_groups || []).map(eg => eg.name);
                
                // Get additional info
                info.generation = speciesData.generation ? speciesData.generation.name : 'Unknown';
                info.habitat = speciesData.habitat ? speciesData.habitat.name : 'Unknown';
                info.capture_rate = speciesData.capture_rate || 'Unknown';
                info.base_happiness = speciesData.base_happiness || 'Unknown';
                
                // Simplified evolution info (avoiding additional API calls for performance)
                info.evolution_info = 'Evolution data available on request';
                
            } catch (speciesError) {
                logger.warn(`Failed to fetch species data: ${speciesError.message}`);
                info.description = 'Description not available';
                info.egg_groups = ['Unknown'];
                info.evolution_info = 'Evolution data unavailable';
                info.generation = 'Unknown';
                info.habitat = 'Unknown';
                info.capture_rate = 'Unknown';
                info.base_happiness = 'Unknown';
            }
            
            // Cache the result (memory only for serverless)
            this.cache.set(cacheKey, info);
            
            logger.info(`Successfully fetched data for ${pokemonName}`);
            return info;
            
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return { error: `Pokemon '${pokemonName}' not found` };
            }
            
            logger.error(`API request failed: ${error.message}`);
            return { error: `Failed to fetch Pokemon data: ${error.message}` };
        }
    }
    
    /**
     * Format Pokemon information into a readable response based on performance mode
     */
    _formatPokemonResponse(pokemonInfo, originalQuery, performanceMode = 'balanced') {
        switch (performanceMode) {
            case 'fast':
                return this._formatFastResponse(pokemonInfo);
            case 'quality':
                return this._formatQualityResponse(pokemonInfo, originalQuery);
            default: // balanced
                return this._formatBalancedResponse(pokemonInfo, originalQuery);
        }
    }
    
    /**
     * Fast mode: Concise, essential information
     */
    _formatFastResponse(pokemonInfo) {
        const typeList = pokemonInfo.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('/');
        const totalStats = Object.values(pokemonInfo.base_stats).reduce((sum, stat) => sum + stat, 0);
        
        return `${pokemonInfo.name} (#${pokemonInfo.id}) - ${typeList} type\n` +
               `Stats: HP ${pokemonInfo.base_stats.hp}, Atk ${pokemonInfo.base_stats.attack}, Def ${pokemonInfo.base_stats.defense}, Total: ${totalStats}\n` +
               `Abilities: ${pokemonInfo.abilities.join(', ')}`;
    }
    
    /**
     * Balanced mode: Natural, conversational response
     */
    _formatBalancedResponse(pokemonInfo, originalQuery) {
        const name = pokemonInfo.name.charAt(0).toUpperCase() + pokemonInfo.name.slice(1);
        const typeList = pokemonInfo.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        const typeText = typeList.length > 1 ? `${typeList.join(' and ')} type` : `${typeList[0]} type`;
        
        let response = `Great choice! ${name} is a fascinating ${typeText} Pokemon. `;
        
        // Add contextual intro based on the query
        if (originalQuery.toLowerCase().includes('stat') || originalQuery.toLowerCase().includes('battle')) {
            response += `Let me break down ${name}'s battle capabilities for you.\n\n`;
        } else if (originalQuery.toLowerCase().includes('evolution')) {
            response += `Here's what you need to know about ${name} and its evolutionary journey.\n\n`;
        } else {
            response += `Here's everything you need to know about this amazing Pokemon!\n\n`;
        }
        
        // Physical characteristics in natural language
        response += `**About ${name}:**\n`;
        response += `${name} stands ${pokemonInfo.height}m tall and weighs ${pokemonInfo.weight}kg, making it a `;
        
        if (pokemonInfo.height < 1) response += 'small and compact ';
        else if (pokemonInfo.height > 2) response += 'large and imposing ';
        else response += 'medium-sized ';
        
        response += `Pokemon. As a ${typeText} Pokemon, it has natural strengths and characteristics that make it unique in battle.\n\n`;
        
        // Abilities in context
        response += `**Natural Abilities:**\n`;
        const abilityNames = pokemonInfo.abilities.map(a => 
            a.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        );
        
        if (abilityNames.length === 1) {
            response += `${name} possesses the ${abilityNames[0]} ability, which provides strategic advantages in battle.\n\n`;
        } else {
            response += `${name} can have the following abilities: ${abilityNames.join(', ')}. These abilities offer different strategic options depending on your battle style.\n\n`;
        }
        
        // Base stats with context
        response += `**Battle Statistics:**\n`;
        const stats = pokemonInfo.base_stats;
        const totalStats = Object.values(stats).reduce((sum, stat) => sum + stat, 0);
        
        response += `${name} has a total base stat sum of ${totalStats}, distributed as follows:\n`;
        response += `- HP: ${stats.hp} (survivability)\n`;
        response += `- Attack: ${stats.attack} (physical damage)\n`;
        response += `- Defense: ${stats.defense} (physical resistance)\n`;
        response += `- Sp. Attack: ${stats['special-attack']} (special damage)\n`;
        response += `- Sp. Defense: ${stats['special-defense']} (special resistance)\n`;
        response += `- Speed: ${stats.speed} (turn order priority)\n\n`;
        
        // Performance analysis
        const strongestStat = Object.entries(stats).reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b);
        const strongestStatName = strongestStat[0].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        response += `**Performance Insights:**\n`;
        response += `${name}'s strongest stat is ${strongestStatName} (${strongestStat[1]}), making it particularly effective at `;
        
        if (strongestStat[0] === 'hp') response += 'staying in battle longer';
        else if (strongestStat[0] === 'attack') response += 'dealing physical damage';
        else if (strongestStat[0] === 'defense') response += 'tanking physical attacks';
        else if (strongestStat[0] === 'special-attack') response += 'dealing special damage';
        else if (strongestStat[0] === 'special-defense') response += 'resisting special attacks';
        else if (strongestStat[0] === 'speed') response += 'acting first in battle';
        
        response += '.\n\n';
        
        // Evolution info if available
        if (pokemonInfo.evolution_info) {
            response += `**Evolution Path:**\n${pokemonInfo.evolution_info}\n\n`;
        }
        
        // Additional context
        if (pokemonInfo.description && pokemonInfo.description !== 'No description available') {
            response += `**Pokedex Entry:**\n${pokemonInfo.description}\n\n`;
        }
        
        response += `Hope this helps you understand ${name} better! Feel free to ask about any other Pokemon or if you need more specific information about ${name}.`;
        
        return response;
    }
    
    /**
     * Quality mode: Comprehensive, analytical response
     */
    _formatQualityResponse(pokemonInfo, originalQuery) {
        const name = pokemonInfo.name.charAt(0).toUpperCase() + pokemonInfo.name.slice(1);
        const typeList = pokemonInfo.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        
        let response = `# Comprehensive ${name} Analysis\n\n`;
        response += `Excellent choice for analysis! ${name} (Pokedex #${pokemonInfo.id}) represents `;
        
        if (pokemonInfo.id <= 151) response += 'a classic Generation I Pokemon with enduring popularity and competitive relevance.\n\n';
        else if (pokemonInfo.id <= 251) response += 'a Generation II Pokemon, part of the beloved Johto region expansion.\n\n';
        else response += 'a Pokemon that has contributed to the ever-expanding world of Pokemon diversity.\n\n';
        
        // Taxonomical and morphological analysis
        response += `## 🔬 Morphological & Taxonomical Profile\n\n`;
        response += `**Physical Specifications:**\n`;
        response += `- Height: ${pokemonInfo.height}m (${pokemonInfo.height < 1 ? 'compact form factor' : pokemonInfo.height > 2 ? 'large-scale morphology' : 'standard proportions'})\n`;
        response += `- Weight: ${pokemonInfo.weight}kg (${pokemonInfo.weight < 10 ? 'lightweight build' : pokemonInfo.weight > 100 ? 'heavyweight class' : 'moderate mass'})\n`;
        response += `- Type Classification: ${typeList.join(' • ')} ${typeList.length > 1 ? '(dual-type strategic advantages)' : '(pure type specialization)'}\n\n`;
        
        // Advanced type analysis
        response += `**Type Effectiveness Analysis:**\n`;
        if (typeList.length > 1) {
            response += `As a dual-type Pokemon, ${name} benefits from the strategic complexity of ${typeList[0]}/${typeList[1]} typing. This combination provides:\n`;
            response += `- Expanded offensive coverage against multiple opponent types\n`;
            response += `- Complex defensive interactions requiring strategic type-matchup knowledge\n`;
            response += `- Potential for both defensive synergies and exploitable weaknesses\n\n`;
        } else {
            response += `${name}'s pure ${typeList[0]} typing offers:\n`;
            response += `- Specialized role clarity in team composition\n`;
            response += `- Predictable but focused type interactions\n`;
            response += `- Clear strategic identity in competitive contexts\n\n`;
        }
        
        // Ability system analysis
        response += `## ⚡ Ability & Capability Systems\n\n`;
        const abilityNames = pokemonInfo.abilities.map(a => 
            a.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        );
        
        response += `**Available Abilities:** ${abilityNames.join(' • ')}\n\n`;
        if (abilityNames.length > 1) {
            response += `${name} demonstrates ability diversity with ${abilityNames.length} possible abilities, allowing for:\n`;
            response += `- Tactical flexibility in team building\n`;
            response += `- Adaptation to different battle scenarios\n`;
            response += `- Strategic unpredictability against opponents\n\n`;
        } else {
            response += `${name} features a singular ability focus, providing:\n`;
            response += `- Consistent strategic implementation\n`;
            response += `- Specialized battlefield role\n`;
            response += `- Predictable but reliable ability activation\n\n`;
        }
        
        // Statistical distribution analysis
        response += `## 📊 Statistical Distribution Analysis\n\n`;
        const stats = pokemonInfo.base_stats;
        const totalStats = Object.values(stats).reduce((sum, stat) => sum + stat, 0);
        const avgStat = totalStats / 6;
        
        response += `**Base Stat Total (BST): ${totalStats}**\n`;
        response += `**Statistical Distribution:**\n\n`;
        
        // Create detailed stat analysis
        const statAnalysis = Object.entries(stats).map(([statName, value]) => {
            const formattedName = statName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const percentage = ((value / totalStats) * 100).toFixed(1);
            const deviation = value - avgStat;
            const deviationText = deviation > 0 ? `+${deviation.toFixed(1)} above average` : `${deviation.toFixed(1)} below average`;
            
            let tier = 'Average';
            if (value >= 130) tier = 'Exceptional';
            else if (value >= 100) tier = 'High';
            else if (value >= 80) tier = 'Above Average';
            else if (value >= 60) tier = 'Moderate';
            else if (value >= 40) tier = 'Below Average';
            else tier = 'Poor';
            
            return {
                name: formattedName,
                value,
                percentage,
                deviation: deviationText,
                tier
            };
        });
        
        statAnalysis.forEach(stat => {
            response += `- **${stat.name}**: ${stat.value} (${stat.percentage}% of BST, ${stat.tier}) - ${stat.deviation}\n`;
        });
        
        // Performance tier analysis
        response += `\n**Performance Classification:**\n`;
        if (totalStats >= 600) response += `${name} ranks as a **Legendary-tier** Pokemon with exceptional overall capabilities.\n`;
        else if (totalStats >= 525) response += `${name} demonstrates **High-performance** stats suitable for competitive play.\n`;
        else if (totalStats >= 450) response += `${name} exhibits **Solid competitive** potential with balanced capabilities.\n`;
        else if (totalStats >= 350) response += `${name} represents **Standard viability** with focused strengths.\n`;
        else response += `${name} shows **Specialized utility** requiring strategic team support.\n\n`;
        
        // Strategic role analysis
        const strongestStat = Object.entries(stats).reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b);
        const secondStrongest = Object.entries(stats).filter(([key]) => key !== strongestStat[0]).reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b);
        
        response += `## 🎯 Strategic Role & Competitive Analysis\n\n`;
        response += `**Primary Role Identification:**\n`;
        response += `Based on statistical distribution, ${name} functions optimally as a `;
        
        if (strongestStat[0] === 'attack' && stats.speed >= 80) response += '**Physical Sweeper**';
        else if (strongestStat[0] === 'special-attack' && stats.speed >= 80) response += '**Special Sweeper**';
        else if (strongestStat[0] === 'defense' || strongestStat[0] === 'special-defense') response += '**Defensive Wall**';
        else if (strongestStat[0] === 'hp') response += '**Tank/Support**';
        else if (strongestStat[0] === 'speed') response += '**Speed Control/Utility**';
        else response += '**Balanced Attacker**';
        
        response += `, with primary focus on ${strongestStat[0].replace('-', ' ')} (${strongestStat[1]}) and secondary emphasis on ${secondStrongest[0].replace('-', ' ')} (${secondStrongest[1]}).\n\n`;
        
        // Evolution analysis if available
        if (pokemonInfo.evolution_info) {
            response += `## 🧬 Evolutionary Biology & Development\n\n`;
            response += `**Evolution Pathway:**\n${pokemonInfo.evolution_info}\n\n`;
            response += `This evolutionary positioning affects ${name}'s:\n`;
            response += `- Availability timing in progressive gameplay\n`;
            response += `- Investment requirements for optimal development\n`;
            response += `- Strategic value in long-term team planning\n\n`;
        }
        
        // Breeding and genetics
        if (pokemonInfo.egg_groups && pokemonInfo.egg_groups.length > 0 && pokemonInfo.egg_groups[0] !== 'Unknown') {
            response += `## 🥚 Breeding & Genetic Compatibility\n\n`;
            const eggGroups = pokemonInfo.egg_groups.map(eg => 
                eg.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            );
            response += `**Egg Group Classification:** ${eggGroups.join(' • ')}\n\n`;
            response += `This classification enables:\n`;
            response += `- Cross-breeding with compatible species for move inheritance\n`;
            response += `- Individual Value (IV) optimization through selective breeding\n`;
            response += `- Hidden ability and shiny variant acquisition strategies\n\n`;
        }
        
        // Pokedex and lore integration
        if (pokemonInfo.description && pokemonInfo.description !== 'No description available') {
            response += `## 📖 Canonical Lore & Pokedex Integration\n\n`;
            response += `**Official Pokedex Entry:**\n"${pokemonInfo.description}"\n\n`;
            response += `This canonical description provides insight into ${name}'s:\n`;
            response += `- Behavioral patterns and habitat preferences\n`;
            response += `- Relationship with trainers and other Pokemon\n`;
            response += `- Role within the broader Pokemon ecosystem\n\n`;
        }
        
        // Conclusion and recommendations
        response += `## 🎖️ Strategic Recommendations & Conclusions\n\n`;
        response += `Based on this comprehensive analysis, ${name} offers:\n\n`;
        response += `**Strengths:**\n`;
        response += `- Exceptional ${strongestStat[0].replace('-', ' ')} capabilities (${strongestStat[1]})\n`;
        response += `- ${typeList.length > 1 ? 'Dual-type versatility' : 'Type specialization'} advantages\n`;
        response += `- ${abilityNames.length > 1 ? 'Flexible ability options' : 'Consistent ability performance'}\n\n`;
        
        response += `**Optimal Use Cases:**\n`;
        response += `- ${totalStats >= 500 ? 'Competitive battle environments' : 'Specialized team roles'}\n`;
        response += `- ${stats.speed >= 80 ? 'Offensive team compositions' : 'Defensive/support strategies'}\n`;
        response += `- ${pokemonInfo.evolution_info ? 'Progressive development builds' : 'Immediate deployment scenarios'}\n\n`;
        
        response += `This analysis demonstrates ${name}'s potential as a ${totalStats >= 500 ? 'high-tier competitive asset' : 'strategic team component'} with clear applications in advanced Pokemon training and battle scenarios.\n\n`;
        response += `For additional analysis of specific matchups, optimization strategies, or comparative studies with other Pokemon, please feel free to request further detailed investigation.`;
        
        return response;
    }
    
    /**
     * Handle competitive matchup between multiple Pokemon
     */
    async _handleCompetitiveMatchup(pokemonNames, query, options, mlParams) {
        logger.info(`Handling competitive matchup: ${pokemonNames.join(' vs ')}`);
        
        try {
            // Fetch data for all Pokemon
            const pokemonData = [];
            for (const name of pokemonNames.slice(0, 3)) { // Limit to 3 Pokemon for performance
                const info = await this._getPokemonInfo(name, mlParams);
                if (!info.error) {
                    pokemonData.push(info);
                }
            }
            
            if (pokemonData.length < 2) {
                return this._generateErrorResponse(pokemonNames.join(' vs '), 'Unable to fetch data for competitive matchup', options.performanceMode || 'balanced');
            }
            
            // Return structured data for competitive analysis
            return {
                type: 'competitive_matchup',
                query: query,
                pokemon: pokemonData,
                pokemonNames: pokemonNames,
                performanceMode: options.performanceMode || 'balanced',
                mlEnhanced: !!mlParams,
                focus: mlParams?.focus || 'competitive'
            };
            
        } catch (error) {
            logger.error(`Competitive matchup error: ${error.message}`);
            return this._generateErrorResponse(pokemonNames.join(' vs '), error.message, options.performanceMode || 'balanced');
        }
    }
}

module.exports = PokemonTool;
