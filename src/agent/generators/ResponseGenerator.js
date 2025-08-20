/**
 * ResponseGenerator - Generates responses based on performance mode
 * 
 * Handles generation of responses for different performance modes
 * and query types with appropriate sophistication levels.
 */

const logger = require('../../utils/logger');
const QueryAnalyzer = require('../analyzers/QueryAnalyzer');

class ResponseGenerator {
    constructor(performanceMode = 'balanced') {
        this.performanceMode = performanceMode;
        this.queryAnalyzer = new QueryAnalyzer();
    }

    /**
     * Generate response based on performance mode and content type
     */
    async generateResponse(content, query, type = 'general', mlParams = null) {
        switch (type) {
            case 'pokemon':
                return await this.generatePokemonResponse(content, query, mlParams);
            case 'competitive_matchup':
                return await this.generateCompetitiveMatchupResponse(content, query, mlParams);
            case 'general':
            default:
                return await this.generateGeneralResponse(query);
        }
    }

    /**
     * Generate Pokemon response based on performance mode
     */
    async generatePokemonResponse(pokemon, query, mlParams = null) {
        // Use ML-enhanced generation if available
        if (mlParams && this.performanceMode === 'quality') {
            return await this.generateMLEnhancedPokemonResponse(pokemon, query, mlParams);
        }

        // Quick analysis for mode selection
        const analysis = this.queryAnalyzer.analyzePokemonQuery(query);
        
        switch (this.performanceMode) {
            case 'fast':
                return this._generateFastPokemonResponse(pokemon, analysis);
            case 'balanced':
                return this._generateBalancedPokemonResponse(pokemon, analysis, query);
            case 'quality':
                return await this._generateQualityPokemonResponse(pokemon, analysis, query);
            default:
                return this._generateBalancedPokemonResponse(pokemon, analysis, query);
        }
    }

    /**
     * Generate competitive matchup response
     */
    async generateCompetitiveMatchupResponse(pokemonList, query, mlParams = null) {
        const pokemonNames = pokemonList.map(p => p.name.charAt(0).toUpperCase() + p.name.slice(1));
        const matchupTitle = pokemonNames.join(' vs ');
        
        let response = `# 🥊 AI-Enhanced Competitive Matchup Analysis\n\n`;
        response += `## ${matchupTitle} Competitive Assessment\n\n`;
        
        if (mlParams) {
            const confidence = Math.round(mlParams.confidence * 100);
            response += `Through advanced ML analysis (${confidence}% confidence), I've analyzed this competitive matchup across multiple strategic dimensions.\n\n`;
            
            response += `**ML-Detected Query Parameters:**\n`;
            response += `- Primary Focus: ${mlParams.focus || 'Competitive'}\n`;
            response += `- Detected Intents: ${mlParams.queryIntents.join(', ')}\n`;
            response += `- Matchup Type: ${pokemonList.length}-way competitive analysis\n\n`;
        }
        
        // Individual Pokemon analysis
        response += `## 📊 Individual Pokemon Analysis\n\n`;
        
        for (let i = 0; i < pokemonList.length; i++) {
            const pokemon = pokemonList[i];
            const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
            const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
            const totalBST = Object.values(pokemon.base_stats).reduce((sum, stat) => sum + stat, 0);
            const maxStat = Math.max(...Object.values(pokemon.base_stats));
            const maxStatName = Object.entries(pokemon.base_stats).find(([k, v]) => v === maxStat)[0];
            
            response += `### ${name} (${types.join('/')} Type)\n\n`;
            response += `**Competitive Profile:**\n`;
            response += `- **Total BST:** ${totalBST}\n`;
            response += `- **Strongest Asset:** ${maxStatName.replace('-', ' ')} (${maxStat})\n`;
            response += `- **Abilities:** ${pokemon.abilities.join(', ')}\n`;
            response += `- **Role:** ${this._determineCompetitiveRole(pokemon)}\n\n`;
        }
        
        // Head-to-head analysis for 2 Pokemon
        if (pokemonList.length === 2) {
            response += await this._generateHeadToHeadAnalysis(pokemonList[0], pokemonList[1]);
        }
        
        // Strategic recommendations
        response += `## 🎯 Strategic Recommendations\n\n`;
        response += `**Team Building Insights:**\n`;
        
        for (let i = 0; i < pokemonList.length; i++) {
            const pokemon = pokemonList[i];
            const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
            const role = this._determineCompetitiveRole(pokemon);
            
            response += `- **${name}:** Best utilized as ${role.toLowerCase()} with focus on ${this._getStrengthFocus(pokemon)}\n`;
        }
        
        response += `\n**Competitive Environment:**\n`;
        response += `- Consider team synergy and coverage gaps\n`;
        response += `- Account for common meta threats\n`;
        response += `- Optimize movesets for intended roles\n`;
        response += `- Factor in ability choices and item builds\n\n`;
        
        if (mlParams) {
            response += `**Analysis Completeness:** Comprehensive competitive assessment\n`;
            response += `**Confidence Level:** ${Math.round(mlParams.confidence * 100)}%\n\n`;
        }
        
        response += `This ML-enhanced competitive analysis provides strategic insights for informed team building and battle preparation.`;
        
        return response;
    }

    /**
     * Generate head-to-head analysis for two Pokemon
     */
    async _generateHeadToHeadAnalysis(pokemon1, pokemon2) {
        const name1 = pokemon1.name.charAt(0).toUpperCase() + pokemon1.name.slice(1);
        const name2 = pokemon2.name.charAt(0).toUpperCase() + pokemon2.name.slice(1);
        
        let analysis = `## ⚔️ Head-to-Head Matchup Analysis\n\n`;
        
        // Type effectiveness analysis
        const typeMatchup = this._analyzeTypeMatchup(pokemon1.types, pokemon2.types);
        analysis += `**Type Effectiveness:**\n`;
        analysis += `- ${name1} vs ${name2}: ${typeMatchup.pokemon1vs2}\n`;
        analysis += `- ${name2} vs ${name1}: ${typeMatchup.pokemon2vs1}\n\n`;
        
        // Stat comparison
        const statComparison = this._compareStats(pokemon1.base_stats, pokemon2.base_stats);
        analysis += `**Statistical Advantages:**\n`;
        analysis += `- ${name1} leads in: ${statComparison.pokemon1Advantages.join(', ')}\n`;
        analysis += `- ${name2} leads in: ${statComparison.pokemon2Advantages.join(', ')}\n\n`;
        
        // Speed comparison (crucial for competitive)
        const speedAdvantage = pokemon1.base_stats.speed > pokemon2.base_stats.speed ? name1 : 
                              pokemon2.base_stats.speed > pokemon1.base_stats.speed ? name2 : 'Tie';
        analysis += `**Speed Control:** ${speedAdvantage} ${speedAdvantage !== 'Tie' ? 'has speed advantage' : '- equal speed'}\n\n`;
        
        // Overall matchup verdict
        const verdict = this._calculateMatchupVerdict(pokemon1, pokemon2);
        analysis += `**AI Matchup Verdict:** ${verdict}\n\n`;
        
        return analysis;
    }

    /**
     * Generate general response for non-Pokemon queries
     */
    async generateGeneralResponse(task) {
        switch (this.performanceMode) {
            case 'fast':
                return this._generateFastResponse(task);
            case 'balanced':
                return this._generateBalancedResponse(task);
            case 'quality':
                return await this._generateQualityResponse(task);
            default:
                return this._generateBalancedResponse(task);
        }
    }

    // Pokemon Response Generators by Mode

    /**
     * Fast mode: Concise, focused responses
     */
    _generateFastPokemonResponse(pokemon, analysis) {
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        
        if (analysis.wantsStats) {
            const stats = pokemon.base_stats;
            return `${name} Stats: HP ${stats.hp}, ATK ${stats.attack}, DEF ${stats.defense}, SPA ${stats['special-attack']}, SPD ${stats['special-defense']}, SPE ${stats.speed}. Total: ${Object.values(stats).reduce((a, b) => a + b, 0)}`;
        }
        
        if (analysis.wantsTypes) {
            return `${name} is a ${types.join('/')} type Pokemon. Abilities: ${pokemon.abilities.join(', ')}.`;
        }
        
        if (analysis.wantsEvolution && pokemon.evolution_info) {
            return `${name} Evolution: ${pokemon.evolution_info}`;
        }
        
        // General quick summary
        return `${name} (#${pokemon.id}): ${types.join('/')} type, ${pokemon.height}m, ${pokemon.weight}kg. Abilities: ${pokemon.abilities.join(', ')}. Notable for its ${Object.entries(pokemon.base_stats).reduce((a, b) => pokemon.base_stats[a[0]] > pokemon.base_stats[b[0]] ? a : b)[0]} stat.`;
    }

    /**
     * Balanced mode: Natural, conversational responses
     */
    _generateBalancedPokemonResponse(pokemon, analysis, query) {
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        const typeText = types.length > 1 ? `${types.join(' and ')} type` : `${types[0]} type`;
        
        // Start with contextual opening based on what they asked
        let response = '';
        
        if (analysis.wantsStrategy || analysis.wantsStats) {
            response = `Great question about ${name}! This ${typeText} Pokemon is quite interesting from a strategic perspective. `;
        } else if (analysis.wantsEvolution) {
            response = `${name} has some fascinating evolutionary characteristics! `;
        } else {
            response = `${name} is a wonderful ${typeText} Pokemon with some really unique traits. `;
        }
        
        // Add abilities context
        const abilities = pokemon.abilities.map(a => a.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        if (abilities.length > 1) {
            response += `It can have either ${abilities.slice(0, -1).join(', ')} or ${abilities.slice(-1)} as its ability, which gives it some strategic flexibility. `;
        } else {
            response += `Its ${abilities[0]} ability gives it some interesting tactical options. `;
        }
        
        // Add evolution context if relevant
        if (pokemon.evolution_info && (analysis.wantsEvolution || analysis.isGeneral)) {
            response += `As for evolution, ${pokemon.evolution_info} `;
        }
        
        // Physical description with personality
        response += `**Physical Stats:** This Pokemon stands ${pokemon.height}m tall and weighs ${pokemon.weight}kg, `;
        if (pokemon.height < 1) {
            response += `making it quite compact and agile. `;
        } else if (pokemon.height > 2) {
            response += `giving it an impressive and imposing presence. `;
        } else {
            response += `making it well-proportioned for both offense and defense. `;
        }
        
        response += `\n\nWould you like me to dive deeper into any specific aspect of ${name}, like competitive movesets, breeding strategies, or type matchup analysis?`;
        
        return response;
    }

    /**
     * Quality mode: Comprehensive, analytical responses
     */
    async _generateQualityPokemonResponse(pokemon, analysis, query) {
        // This would include the comprehensive quality response logic
        // For brevity, returning a structured response
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        
        let response = `# Advanced ${name} Analysis & Strategic Assessment\n\n`;
        response += `Thank you for your inquiry regarding ${name}. I'll provide a comprehensive analysis drawing from multiple analytical frameworks.\n\n`;
        
        // Add detailed sections based on analysis
        if (analysis.wantsEvolution) {
            response += await this._generateEvolutionSection(pokemon);
        }
        
        response += this._generateStatsSection(pokemon);
        response += this._generateStrategicSection(pokemon);
        
        return response;
    }

    // General Response Generators by Mode

    _generateFastResponse(task) {
        const lowerTask = task.toLowerCase();
        
        if (lowerTask.includes('hello') || lowerTask.includes('hi ')) {
            return `Hello! I'm ready to help with Pokemon questions or general assistance.`;
        }
        
        if (lowerTask.includes('help')) {
            return `I can help with Pokemon information, competitive analysis, and general questions. What would you like to know?`;
        }
        
        return `Got it! While I can help with "${task}", I'm especially good with Pokemon questions. Try asking about a specific Pokemon!`;
    }

    _generateBalancedResponse(task) {
        const lowerTask = task.toLowerCase();
        
        if (lowerTask.includes('hello') || lowerTask.includes('hi ')) {
            return `Hello there! It's great to meet you. I'm here to help with a wide range of topics, but I'm particularly knowledgeable about Pokemon. What can I assist you with today?`;
        }
        
        if (lowerTask.includes('help')) {
            return `I'd be happy to help! I can assist with Pokemon analysis, competitive strategies, general questions, and much more. My specialty is providing detailed Pokemon information including stats, abilities, evolution paths, and battle strategies. What specific topic interests you?`;
        }
        
        return `I appreciate you sharing "${task}" with me! I'm always eager to help and discuss various topics. While I can provide general assistance, my expertise really shines when it comes to Pokemon. Is there a particular Pokemon or topic you'd like to explore together?`;
    }

    async _generateQualityResponse(task) {
        const complexity = this.queryAnalyzer.analyzeTaskComplexity(task);
        const sentiment = this.queryAnalyzer.analyzeSentiment(task);
        
        let response = `Thank you for sharing "${task}" with me. I've analyzed your query and can see `;
        response += complexity.domains.length > 1 ? `connections to topics like ${complexity.domains.join(', ')}` : 'various interesting dimensions to explore';
        response += `.\n\n`;
        
        response += `As an AI system operating in quality mode, I'm designed to provide comprehensive, nuanced responses. `;
        response += `While I can engage with various topics, my expertise is particularly sophisticated in Pokemon analysis.\n\n`;
        
        if (sentiment.confidence > 0.7) {
            response += `I detect a ${sentiment.isPositive ? 'positive and engaging' : 'thoughtful and serious'} tone in your message. `;
        }
        
        response += `To provide the most valuable response, could you help me understand what specific aspect you'd like me to explore most deeply?`;
        
        return response;
    }

    // Helper Methods

    _determineCompetitiveRole(pokemon) {
        const stats = pokemon.base_stats;
        const maxStat = Math.max(...Object.values(stats));
        const maxStatName = Object.entries(stats).find(([k, v]) => v === maxStat)[0];
        
        if (maxStatName === 'attack' && stats.speed >= 80) return 'Physical Sweeper';
        if (maxStatName === 'special-attack' && stats.speed >= 80) return 'Special Sweeper';
        if (maxStatName === 'defense') return 'Physical Wall';
        if (maxStatName === 'special-defense') return 'Special Wall';
        if (maxStatName === 'speed') return 'Speed Control';
        if (maxStatName === 'hp') return 'Tank/Support';
        return 'Balanced Fighter';
    }

    _analyzeTypeMatchup(types1, types2) {
        // Simplified type effectiveness
        const typeChart = {
            'electric': { strongAgainst: ['water', 'flying'], weakAgainst: ['ground', 'grass'] },
            'ground': { strongAgainst: ['electric', 'fire', 'rock'], weakAgainst: ['water', 'grass'] },
            'water': { strongAgainst: ['fire', 'ground', 'rock'], weakAgainst: ['electric', 'grass'] },
            'fire': { strongAgainst: ['grass', 'ice'], weakAgainst: ['water', 'ground', 'rock'] },
            'grass': { strongAgainst: ['water', 'ground', 'rock'], weakAgainst: ['fire', 'ice', 'flying'] },
            'rock': { strongAgainst: ['fire', 'ice', 'flying'], weakAgainst: ['water', 'grass', 'ground'] }
        };
        
        const getEffectiveness = (attackerTypes, defenderTypes) => {
            let effectiveness = 'Normal';
            for (const attackType of attackerTypes) {
                const chart = typeChart[attackType.toLowerCase()];
                if (chart) {
                    for (const defType of defenderTypes) {
                        if (chart.strongAgainst?.includes(defType.toLowerCase())) {
                            effectiveness = 'Super Effective';
                        } else if (chart.weakAgainst?.includes(defType.toLowerCase())) {
                            effectiveness = 'Not Very Effective';
                        }
                    }
                }
            }
            return effectiveness;
        };
        
        return {
            pokemon1vs2: getEffectiveness(types1, types2),
            pokemon2vs1: getEffectiveness(types2, types1)
        };
    }

    _compareStats(stats1, stats2) {
        const pokemon1Advantages = [];
        const pokemon2Advantages = [];
        
        for (const [stat, value1] of Object.entries(stats1)) {
            const value2 = stats2[stat];
            if (value1 > value2) {
                pokemon1Advantages.push(stat.replace('-', ' '));
            } else if (value2 > value1) {
                pokemon2Advantages.push(stat.replace('-', ' '));
            }
        }
        
        return { pokemon1Advantages, pokemon2Advantages };
    }

    _calculateMatchupVerdict(pokemon1, pokemon2) {
        const name1 = pokemon1.name.charAt(0).toUpperCase() + pokemon1.name.slice(1);
        const name2 = pokemon2.name.charAt(0).toUpperCase() + pokemon2.name.slice(1);
        
        const total1 = Object.values(pokemon1.base_stats).reduce((sum, stat) => sum + stat, 0);
        const total2 = Object.values(pokemon2.base_stats).reduce((sum, stat) => sum + stat, 0);
        
        const typeMatchup = this._analyzeTypeMatchup(pokemon1.types, pokemon2.types);
        
        if (Math.abs(total1 - total2) < 50) {
            return `Close matchup - ${typeMatchup.pokemon1vs2 === 'Super Effective' ? name1 : typeMatchup.pokemon2vs1 === 'Super Effective' ? name2 : 'outcome depends on strategy and movesets'}`;
        }
        
        const statWinner = total1 > total2 ? name1 : name2;
        return `${statWinner} has statistical advantage, but type effectiveness and strategy matter significantly`;
    }

    _getStrengthFocus(pokemon) {
        const stats = pokemon.base_stats;
        const maxStat = Math.max(...Object.values(stats));
        const maxStatName = Object.entries(stats).find(([k, v]) => v === maxStat)[0];
        return maxStatName.replace('-', ' ') + ' optimization';
    }

    _generateStatsSection(pokemon) {
        const stats = pokemon.base_stats;
        const total = Object.values(stats).reduce((sum, stat) => sum + stat, 0);
        
        let section = `## Statistical Analysis\n\n`;
        section += `**Base Stat Total:** ${total}\n\n`;
        section += `| Stat | Value |\n|------|-------|\n`;
        
        Object.entries(stats).forEach(([stat, value]) => {
            const statName = stat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            section += `| ${statName} | ${value} |\n`;
        });
        
        section += `\n`;
        return section;
    }

    _generateStrategicSection(pokemon) {
        const role = this._determineCompetitiveRole(pokemon);
        const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        
        let section = `## Strategic Assessment\n\n`;
        section += `**Competitive Role:** ${role}\n`;
        section += `**Type Coverage:** ${types.join('/')}\n`;
        section += `**Abilities:** ${pokemon.abilities.join(', ')}\n\n`;
        
        return section;
    }

    async _generateEvolutionSection(pokemon) {
        let section = `## Evolution Analysis\n\n`;
        
        if (pokemon.evolution_info && pokemon.evolution_info !== 'Evolution data available on request') {
            section += `**Evolution Information:** ${pokemon.evolution_info}\n\n`;
        } else {
            section += `**Evolution Information:** Detailed evolution data available upon specific request.\n\n`;
        }
        
        return section;
    }
}

module.exports = ResponseGenerator;
