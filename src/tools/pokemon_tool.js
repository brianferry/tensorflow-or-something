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
    async execute(query) {
        try {
            logger.info(`Pokemon tool executing query: ${query}`);
            
            // Extract Pokemon name from query
            const pokemonName = this._extractPokemonName(query);
            
            if (!pokemonName) {
                return "I couldn't identify a specific Pokemon name in your query. Please specify a Pokemon name (e.g., 'Pikachu', 'Charizard', etc.).";
            }
            
            // Get Pokemon information
            const pokemonInfo = await this._getPokemonInfo(pokemonName);
            
            if (pokemonInfo.error) {
                return `Sorry, I couldn't find information about '${pokemonName}': ${pokemonInfo.error}`;
            }
            
            // Format the response
            return this._formatPokemonResponse(pokemonInfo);
            
        } catch (error) {
            logger.error(`Pokemon tool error: ${error.message}`);
            return `I encountered an error while fetching Pokemon information: ${error.message}. Please try again.`;
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
     * Format Pokemon information into a readable response
     */
    _formatPokemonResponse(pokemonInfo) {
        let response = `**${pokemonInfo.name} (#${pokemonInfo.id})**\n\n`;
        
        response += `**Physical Characteristics:**\n`;
        response += `- Height: ${pokemonInfo.height} meters\n`;
        response += `- Weight: ${pokemonInfo.weight} kg\n`;
        response += `- Type(s): ${pokemonInfo.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}\n\n`;
        
        response += `**Abilities:** ${pokemonInfo.abilities.map(a => 
            a.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        ).join(', ')}\n\n`;
        
        if (pokemonInfo.egg_groups && pokemonInfo.egg_groups.length > 0 && pokemonInfo.egg_groups[0] !== 'Unknown') {
            response += `**Breeding Information:**\n`;
            response += `- Egg Group(s): ${pokemonInfo.egg_groups.map(eg => 
                eg.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            ).join(', ')}\n\n`;
        }
        
        if (pokemonInfo.evolution_info) {
            response += `**Evolution:**\n- ${pokemonInfo.evolution_info}\n\n`;
        }
        
        response += `**Base Stats:**\n`;
        for (const [statName, value] of Object.entries(pokemonInfo.base_stats)) {
            const formattedStat = statName.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            response += `- ${formattedStat}: ${value}\n`;
        }
        
        // Add additional info if available
        if (pokemonInfo.capture_rate !== 'Unknown') {
            response += `\n**Additional Info:**\n`;
            response += `- Capture Rate: ${pokemonInfo.capture_rate}\n`;
            
            if (pokemonInfo.base_happiness !== 'Unknown') {
                response += `- Base Happiness: ${pokemonInfo.base_happiness}\n`;
            }
            
            if (pokemonInfo.generation !== 'Unknown') {
                response += `- Generation: ${pokemonInfo.generation.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}\n`;
            }
            
            if (pokemonInfo.habitat !== 'Unknown') {
                response += `- Habitat: ${pokemonInfo.habitat.charAt(0).toUpperCase() + pokemonInfo.habitat.slice(1)}\n`;
            }
        }
        
        if (pokemonInfo.description && pokemonInfo.description !== 'No description available') {
            response += `\n**Description:** ${pokemonInfo.description}`;
        }
        
        return response;
    }
}

module.exports = PokemonTool;
