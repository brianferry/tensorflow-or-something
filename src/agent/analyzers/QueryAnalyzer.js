/**
 * QueryAnalyzer - Advanced text analysis and sentiment detection
 * 
 * Provides comprehensive text analysis including sentiment analysis,
 * complexity assessment, and domain detection.
 */

const logger = require('../../utils/logger');

class QueryAnalyzer {
    constructor() {
        this.positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'excited', 'thank', 'thanks', 'please'];
        this.negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'frustrated', 'problem', 'issue', 'wrong', 'broken', 'error', 'fail'];
        this.questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should'];
    }

    /**
     * Analyze Pokemon query to understand user intent
     */
    analyzePokemonQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        return {
            wantsStats: /stat|attack|defense|speed|hp|base|power|strong/.test(lowerQuery),
            wantsEvolution: /evolv|evolution|level|grow/.test(lowerQuery),
            wantsTypes: /type|effective|weakness|strength|resist/.test(lowerQuery),
            wantsAbilities: /abilit|skill|talent|power/.test(lowerQuery),
            wantsStrategy: /battle|fight|competitive|strategy|meta|pvp/.test(lowerQuery),
            wantsComparison: /compare|versus|vs|better|stronger|which|matchup/.test(lowerQuery),
            wantsBreeding: /breed|egg|hatch|genetics/.test(lowerQuery),
            isGeneral: !/stat|evolv|type|abilit|battle|breed|vs|versus|matchup/.test(lowerQuery),
            tone: this.analyzeSentiment(query)
        };
    }

    /**
     * Analyze sentiment of the input text
     */
    analyzeSentiment(text) {
        const words = text.toLowerCase().split(/\s+/);
        let positiveScore = 0;
        let negativeScore = 0;
        let questionScore = 0;
        
        words.forEach(word => {
            if (this.positiveWords.includes(word)) {
                positiveScore++;
            }
            if (this.negativeWords.includes(word)) {
                negativeScore++;
            }
            if (this.questionWords.includes(word)) {
                questionScore++;
            }
        });
        
        const totalScore = positiveScore - negativeScore;
        const confidence = Math.min((Math.abs(totalScore) + questionScore) / words.length * 3, 1);
        
        return {
            isPositive: totalScore >= 0,
            score: totalScore,
            confidence: confidence,
            hasQuestion: questionScore > 0
        };
    }

    /**
     * Analyze task complexity and suggest focus areas
     */
    analyzeTaskComplexity(task) {
        const lowerTask = task.toLowerCase();
        
        // Identify domains
        const domains = [];
        if (lowerTask.includes('programming') || lowerTask.includes('code') || lowerTask.includes('software')) {
            domains.push('Software Development');
        }
        if (lowerTask.includes('ai') || lowerTask.includes('machine learning') || lowerTask.includes('neural')) {
            domains.push('Artificial Intelligence');
        }
        if (lowerTask.includes('pokemon') || lowerTask.includes('pikachu') || lowerTask.includes('charizard')) {
            domains.push('Pokemon Knowledge Systems');
        }
        if (lowerTask.includes('data') || lowerTask.includes('analysis') || lowerTask.includes('statistics')) {
            domains.push('Data Science');
        }
        if (lowerTask.includes('technology') || lowerTask.includes('computer') || lowerTask.includes('system')) {
            domains.push('Technology');
        }
        
        // Analyze cognitive load using compromise if available
        let sentences = 1;
        let questions = 0;
        let topics = 0;
        
        try {
            const compromise = require('compromise');
            const doc = compromise(task);
            sentences = task.split(/[.!?]+/).length;
            questions = doc.questions().out('array').length;
            topics = doc.topics().out('array').length;
        } catch (error) {
            // Fallback analysis
            sentences = task.split(/[.!?]+/).length;
            questions = (task.match(/\?/g) || []).length;
            topics = (task.match(/\b[A-Z][a-z]+\b/g) || []).length;
        }
        
        let cognitiveLoad = 'low';
        if (sentences > 2 || questions > 1 || topics > 3) {
            cognitiveLoad = 'high';
        } else if (sentences > 1 || questions > 0 || topics > 1) {
            cognitiveLoad = 'medium';
        }
        
        // Suggest focus based on domains
        let suggestedFocus = 'general exploration';
        if (domains.includes('Pokemon Knowledge Systems')) {
            suggestedFocus = 'Pokemon-specific analysis and strategic insights';
        } else if (domains.includes('Artificial Intelligence')) {
            suggestedFocus = 'AI/ML concepts and technical implementation';
        } else if (domains.includes('Software Development')) {
            suggestedFocus = 'Programming best practices and technical guidance';
        }
        
        return {
            domains: domains.length > 0 ? domains : ['General Knowledge'],
            cognitiveLoad,
            suggestedFocus,
            complexity: cognitiveLoad === 'high' ? 'complex' : cognitiveLoad === 'medium' ? 'moderate' : 'simple'
        };
    }

    /**
     * Check if a query is complex
     */
    isComplexQuery(task) {
        const analysis = this.analyzeTaskComplexity(task);
        return analysis.complexity === 'complex' || analysis.domains.length > 2;
    }

    /**
     * Extract Pokemon names from query
     */
    extractPokemonNames(query) {
        const lowerQuery = query.toLowerCase();
        const pokemonPattern = /\b(pikachu|charizard|bulbasaur|squirtle|charmander|mew|mewtwo|lucario|garchomp|rayquaza|arceus|dialga|palkia|giratina|kyogre|groudon|latios|latias|deoxys|jirachi|celebi|manaphy|darkrai|shaymin|victini|keldeo|genesect|diancie|hoopa|volcanion|magearna|marshadow|zeraora|meltan|melmetal|zarude|calyrex|glastrier|spectrier|enamorus|koraidon|miraidon|rhyhorn|rhydon|blastoise|venusaur|alakazam|machamp|gengar|lapras|snorlax|dragonite|typhlosion|feraligatr|meganium|espeon|umbreon|forretress|dunsparce|gligar|qwilfish|scizor|heracross|sneasel|teddiursa|ursaring|slugma|magcargo|swinub|piloswine|corsola|remoraid|octillery|delibird|mantine|skarmory|houndour|houndoom|kingdra|phanpy|donphan|porygon2|stantler|smeargle|tyrogue|hitmontop|smoochum|elekid|magby|miltank|blissey|raikou|entei|suicune|larvitar|pupitar|tyranitar|lugia|ho-oh|celebi)\b/g;
        
        const matches = lowerQuery.match(pokemonPattern);
        return matches ? [...new Set(matches)] : [];
    }

    /**
     * Detect competitive analysis intent
     */
    detectCompetitiveIntent(query) {
        const lowerQuery = query.toLowerCase();
        const competitivePatterns = [
            /\b(vs|versus|against)\b/,
            /\bmatchup\b/,
            /\bcompetitive\b/,
            /\bbattle\b/,
            /\bfight\b/,
            /\bcompare\b/,
            /how does \w+ (stack up|measure) against/
        ];
        
        return competitivePatterns.some(pattern => pattern.test(lowerQuery));
    }

    /**
     * Extract multiple Pokemon for competitive analysis
     */
    extractMultiplePokemon(query) {
        const pokemonNames = this.extractPokemonNames(query);
        const isCompetitive = this.detectCompetitiveIntent(query);
        
        return {
            pokemonNames,
            isCompetitive,
            isMultiPokemon: pokemonNames.length > 1
        };
    }

    /**
     * Advanced NLP analysis using compromise
     */
    advancedNLPAnalysis(query) {
        const analysis = {
            pokemonNames: [],
            intents: [],
            dataNeeds: []
        };
        
        try {
            const compromise = require('compromise');
            const doc = compromise(query);
            
            // Extract entities
            const people = doc.people().out('array');
            const topics = doc.topics().out('array');
            const nouns = doc.nouns().out('array');
            const verbs = doc.verbs().out('array');
            
            // Detect Pokemon names
            analysis.pokemonNames = this.extractPokemonNames(query);
            
            // Detect intents based on verbs and context
            if (verbs.some(v => ['compare', 'versus', 'fight', 'battle'].includes(v.toLowerCase()))) {
                analysis.intents.push('competitive');
            }
            if (verbs.some(v => ['show', 'tell', 'get', 'find'].includes(v.toLowerCase()))) {
                analysis.intents.push('information');
            }
            if (nouns.some(n => ['stats', 'statistics', 'numbers'].includes(n.toLowerCase()))) {
                analysis.intents.push('stats');
                analysis.dataNeeds.push('base_stats');
            }
            if (nouns.some(n => ['evolution', 'evolve'].includes(n.toLowerCase()))) {
                analysis.intents.push('evolution');
                analysis.dataNeeds.push('evolution_chain');
            }
            
        } catch (error) {
            logger.warn(`Advanced NLP analysis failed: ${error.message}`);
            // Fallback to basic analysis
            analysis.pokemonNames = this.extractPokemonNames(query);
            if (this.detectCompetitiveIntent(query)) {
                analysis.intents.push('competitive');
            }
        }
        
        return analysis;
    }
}

module.exports = QueryAnalyzer;
