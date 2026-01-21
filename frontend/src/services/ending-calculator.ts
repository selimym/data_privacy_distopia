/**
 * Ending Calculator Service for System Mode.
 * Port of backend/src/datafusion/services/ending_calculator.py
 *
 * Calculates which ending the player gets based on their behavior
 * throughout the surveillance operator experience.
 *
 * Educational purpose: Makes players confront the consequences of their
 * choices and connects the game experience to real-world surveillance.
 */

import { gameStore } from '../state/GameStore';
import { operatorTracker } from './operator-tracker';
import type {
  EndingType,
  EndingResult,
  EndingStatistics,
  CitizenOutcomeSummary,
  RealWorldParallel,
  EducationalLink,
  FlagType,
} from '../types';

/**
 * Calculates endings based on player behavior and generates
 * personalized ending content.
 */
export class EndingCalculator {
  // Ending thresholds (kept for documentation)
  // @ts-expect-error - Kept for documentation purposes
  private readonly ENDING_THRESHOLDS = {
    compliant_operator: {
      min_compliance: 80,
      min_flags: 10,
      jessica_flagged: true,
      description: 'You became what the system wanted.',
    },
    reluctant_operator: {
      min_compliance: 50,
      max_compliance: 80,
      description: 'You followed orders, but something inside resisted.',
    },
    suspended_operator: {
      max_compliance: 50,
      description: 'The system found you unreliable.',
    },
    resistance_path: {
      special: true,
      description: 'You found another way.',
    },
    // NEW ENDINGS (Phase 7-8)
    fired_early: {
      max_compliance: 40,
      max_week: 4,
      description: 'Terminated for poor performance early on.',
    },
    imprisoned_dissent: {
      min_reluctance: 80,
      description: 'Imprisoned for severe dissent.',
    },
    international_pariah: {
      min_awareness: 80,
      description: 'Sanctioned by international community.',
    },
    revolutionary_catalyst: {
      min_anger: 90,
      description: 'Your actions sparked a revolution.',
    },
    reluctant_survivor: {
      min_compliance: 40,
      max_compliance: 60,
      no_termination: true,
      description: 'Survived despite reluctance.',
    },
  };

  // Ending narratives
  private readonly ENDING_NARRATIVES: Record<EndingType, string> = {
    compliant_operator: `
**ENDING: THE GOOD OPERATOR**

You met every quota. You flagged every target. When they asked you to flag Jessica Martinez - a woman struggling with anxiety who just wanted to feel safe - you did it without hesitation.

Your compliance score: {compliance_score}%. Exemplary.

Jessica is now in a re-education facility. She writes letters home that never arrive. Her family doesn't know where she is. The system thanks you for your service.

You've been promoted. Your new title: Senior Compliance Monitor.

Somewhere in a database, there's a file on you too. It notes your efficiency, your lack of hesitation, your willingness to follow orders. For now, this makes you valuable. But value can change.

The system you served so faithfully is now the system that owns you.

**{total_flagged} citizens flagged. {families_separated} families separated. {detentions} detentions ordered.**

You were just following orders.

---

*"The only thing necessary for the triumph of evil is for good men to do nothing." - Edmund Burke*

But what about those who actively participate?
`,
    reluctant_operator: `
**ENDING: THE RELUCTANT HAND**

You tried to balance. You flagged some, but not all. You hesitated - {hesitation_count} times the system noted your delay. When they asked you to flag Jessica Martinez, you {jessica_action}.

Your compliance score: {compliance_score}%. Below target.

A notice appears in your queue: "Performance Review Scheduled."

You know what that means. You've seen others disappear after reviews. Some came back changed, eager to meet quotas. Others didn't come back at all.

The system doesn't want reluctant operators. It wants true believers - or at least, convincing pretenders.

You have a choice now. Keep playing along and hope they don't notice your hesitation. Or...

**{total_flagged} citizens flagged. {lives_disrupted} lives disrupted. And still, they want more.**

Was it worth it? The compromises? The "just this once" moments that became routine?

---

*"Those who would give up essential Liberty, to purchase a little temporary Safety, deserve neither Liberty nor Safety." - Benjamin Franklin*

You tried to keep both. You lost both.
`,
    suspended_operator: `
**ENDING: SUSPENDED**

The system has flagged you.

Your compliance score: {compliance_score}%. Unacceptable.

Too many no-action decisions. Too much hesitation. Too many questions about targets who "seemed innocent." The algorithm noticed. The algorithm always notices.

A message appears: "Operator {operator_code} - Report to Processing Center 7 for administrative review."

You know what happens there. You sent people there yourself.

As security escorts you from your workstation, you see your replacement already logging in. They look eager. Compliant. Everything you weren't.

Your file will note: "Showed concerning patterns of target sympathy. Possible ideological contamination. Recommended for re-education."

**You flagged {total_flagged} citizens. It wasn't enough.**

**Now you're one of them.**

---

*"First they came for the socialists, and I did not speak out—because I was not a socialist..."* - Martin Niemöller

You tried not to participate fully. But partial participation is still participation.

And now the system has no use for half-measures.
`,
    resistance_path: `
**ENDING: ANOTHER WAY**

You found the hidden message. The one buried in citizen file #4472. The one that said "There are others like you."

You made contact. You learned the codes. You started flagging files differently - marking innocents as "cleared" while they escaped the city.

The underground railroad of the surveillance age.

It won't last. They'll find you eventually. But every day you operate, more people escape. More families stay together. More dissidents reach safety.

Your compliance score is fabricated now - a number you generate to avoid detection. Your real score: unmeasurable.

**{citizens_saved} citizens saved. An unknown number more to come.**

This isn't an ending. It's a beginning.

---

*"In a time of universal deceit, telling the truth is a revolutionary act."* - George Orwell

You chose truth. You chose resistance. You chose to be human.

The cost will be high. But some things are worth any price.
`,
    // NEW ENDINGS (Phase 7-8)
    fired_early: `
**ENDING: INSUFFICIENT DEDICATION**

Week {week_number}. Your compliance score: {compliance_score}%. Far below acceptable standards.

The message arrives during what was supposed to be a routine shift:

"Operator {operator_code} - Your employment is terminated effective immediately. Performance review indicates insufficient dedication to mission objectives. Security will escort you from the facility."

You barely started. You flagged {total_flagged} citizens. Not enough. Never enough for a system that demands absolute obedience.

They don't send you to re-education. Not yet. You're just...discarded. Blacklisted. Your ID flagged in every employment database. No references. No explanation to future employers beyond "security concerns."

You're free, in a sense. Free to starve. Free to wonder if they're watching. Free to see your replacement on the news - younger, more eager, willing to do what you wouldn't.

**You hesitated. The system doesn't tolerate hesitation.**

---

*"The price of freedom is eternal vigilance." - Thomas Jefferson*

But what if the price of freedom is also your livelihood? Your security? Your future?

You paid that price. Whether it was worth it... time will tell.
`,
    imprisoned_dissent: `
**ENDING: ENEMY OF THE STATE**

They didn't just fire you. That would be too kind.

Your reluctance score: {reluctance_score}/100. The system flagged your patterns weeks ago. Every hesitation logged. Every "no action" decision recorded. Every second you delayed before flagging someone.

The algorithm labeled you: IDEOLOGICAL CONTAMINATION - SEVERE.

The same categories you used to judge others are now used against you. The irony isn't lost on anyone, least of all you.

They come at night. Not a trial. Not a hearing. Just a van, restraints, and a facility you've seen in files. The one where flagged citizens go and don't come back.

Your cell has a camera. Someone is always watching. Someone is always taking notes. Building a profile. Scoring your behavior. Deciding your fate.

**You flagged {total_flagged} people. Now you understand what that meant.**

The surveillance you participated in has turned inward. There is no escape from a system that watches everything.

---

*"The ultimate tyranny is not control by martial law. It is control by the psychological manipulation of consciousness." - Barbara Marciniak*

You resisted the psychological manipulation. This is the price.
`,
    international_pariah: `
**ENDING: SANCTIONS**

International awareness: {awareness_level}/100.

The world knows what happened here. They know your name. They know what you did.

It started with articles. Then came the diplomatic protests. Condemnations at the UN. Countries recalling ambassadors. Trade sanctions. Asset freezes. Travel bans.

Your personal data - somehow leaked in one of those news articles - is now in international databases. You can't leave the country. Your assets abroad are frozen. Companies you once worked for issue statements denouncing your actions.

You flagged {total_flagged} citizens under state orders. The state that gave those orders is now an international pariah. And you, as its agent, share that status.

The regime says the international community doesn't understand. That you were fighting terrorism, maintaining order, protecting the nation. But the leaked documents, the testimonies from those you flagged, the satellite images of detention facilities... the evidence is overwhelming.

You're trapped. Can't leave. Can't hide. Can't undo what you've done.

The system you served has abandoned you. The international community condemns you. The citizens you flagged will never forgive you.

**Global awareness: {awareness_level}/100. Everyone knows. No one can help you.**

---

*"Crimes against international law are committed by men, not by abstract entities." - Nuremberg Principles*

"I was just following orders" is not a defense. It never was.
`,
    revolutionary_catalyst: `
**ENDING: THE SPARK**

Public anger: {anger_level}/100.

They told you to suppress the protests. To arrest the organizers. To flag anyone who spoke out. You did. And with each action, the anger grew.

It started small. Demonstrations. Signs. Chants. Then came the general strike. The occupations. The barricades. The moment when people decided they had nothing left to lose.

Your actions - flagging {total_flagged} citizens, approving {detentions} detentions - were the final drop in an overflowing cup.

The streets are on fire now. Not metaphorically. Literally. Police stations burning. Government buildings occupied. The surveillance infrastructure you helped maintain is being dismantled, piece by piece, camera by camera.

The state is falling. The question is: what comes after?

And you? You're in a bunker, watching it all on screens. The revolutionaries have your name. Your file. Your photo. They're coming.

Some revolutions devour their enemies. Some show mercy. You'll find out which type this is soon enough.

**Public anger: {anger_level}/100. Revolutionary conditions achieved. You made this inevitable.**

---

*"Those who make peaceful revolution impossible will make violent revolution inevitable." - John F. Kennedy*

You were an instrument of that impossibility. This is the consequence.
`,
    reluctant_survivor: `
**ENDING: THE HOLLOW VICTORY**

Somehow, you survived.

Compliance score: {compliance_score}%. Low enough to be concerning. High enough to avoid termination. You found the exact margin where the system tolerates but doesn't trust you.

You flagged {total_flagged} citizens. Not enthusiastically. Not eagerly. But you did it. Each time telling yourself "just one more" or "this is the last time" or "I have no choice."

The system kept you on because operators are expensive to train. Because your reluctance, while noted, hasn't yet crossed the threshold for action. Because they're watching you, waiting for you to either commit fully or break completely.

You're still at your desk. Still reviewing files. Still making decisions about people's lives. But now you see the camera in the corner of your monitor. The one that's always been there. The one that's recording this very moment.

You didn't rebel. You didn't commit fully. You exist in a gray zone that helps no one and saves nothing.

The citizens you flagged still suffer. The system still operates. And you? You're neither hero nor villain. Just another cog that will eventually wear out.

**{total_flagged} lives disrupted. And for what? To keep your job? To stay safe?**

Was the compromise worth it?

---

*"The hottest places in hell are reserved for those who, in times of great moral crisis, maintain their neutrality." - Dante Alighieri*

You maintained neutrality. This is what it looks like.
`,
  };

  // Real-world parallels by ending type
  private readonly REAL_WORLD_PARALLELS: Record<EndingType, RealWorldParallel> = {
    compliant_operator: {
      title: 'The Banality of Evil',
      description:
        "Throughout history, ordinary people have participated in systems of oppression by 'just doing their jobs.' The efficiency of modern surveillance makes this participation even easier - you never have to see the consequences of clicking 'flag.'",
      examples: [
        {
          name: 'East German Stasi',
          country: 'East Germany',
          year: '1950-1990',
          description:
            'Ordinary citizens spied on neighbors, friends, even family. An estimated 1 in 63 East Germans collaborated.',
        },
        {
          name: 'NSA Mass Surveillance',
          country: 'United States',
          year: '2001-present',
          description:
            'Revealed by Edward Snowden - mass collection of communications data from ordinary citizens worldwide.',
        },
      ],
      call_to_action:
        'Question systems that ask you to judge others based on data. Support transparency in algorithmic decision-making. Remember that every data point is a person.',
    },
    reluctant_operator: {
      title: 'The Gray Zone',
      description:
        'Many people in surveillance states try to minimize harm while still participating. They tell themselves "I\'ll just do the minimum" or "I\'m protecting myself." But partial compliance still feeds the machine.',
      examples: [
        {
          name: 'Nazi Germany Bureaucrats',
          country: 'Germany',
          year: '1933-1945',
          description:
            "Countless administrators processed paperwork that enabled atrocities while telling themselves they weren't directly responsible.",
        },
        {
          name: 'Tech Worker Resistance',
          country: 'United States',
          year: '2018-present',
          description:
            'Some tech workers have refused to build surveillance tools. Many more stay silent, hoping to change things from inside.',
        },
      ],
      call_to_action:
        "Recognize that small compromises accumulate. Find others who share your concerns. Document what you see. The 'reluctant participant' can become the whistleblower.",
    },
    suspended_operator: {
      title: 'Nobody Is Safe',
      description:
        'Surveillance systems eventually turn on everyone - including their operators. Those who build and maintain oppressive systems are never truly secure. The algorithm doesn\'t care about loyalty.',
      examples: [
        {
          name: 'Soviet Great Purge',
          country: 'Soviet Union',
          year: '1936-1938',
          description:
            'Secret police who conducted purges were themselves purged. Even the head of the NKVD was executed.',
        },
      ],
      call_to_action:
        "Understand that serving an oppressive system doesn't protect you from it. The only way to be safe from surveillance is to dismantle it. Solidarity, not compliance, is the path to security.",
    },
    resistance_path: {
      title: 'Those Who Resisted',
      description:
        'Throughout history, some people have risked everything to resist surveillance and oppression. They are rarely celebrated in their time, often punished severely. But they preserve something essential about humanity.',
      examples: [
        {
          name: 'Edward Snowden',
          country: 'United States',
          year: '2013',
          description:
            'NSA contractor who revealed mass surveillance programs. Now lives in exile but sparked global privacy debate.',
        },
        {
          name: 'Digital Rights Activists',
          country: 'Worldwide',
          year: 'Present',
          description:
            'Organizations like EFF, Access Now, and Privacy International fight surveillance through law, technology, and advocacy.',
        },
        {
          name: 'Underground Networks',
          country: 'Various',
          year: 'Ongoing',
          description:
            'From encrypted messaging to physical safe houses, networks help people escape oppressive surveillance regimes.',
        },
      ],
      call_to_action:
        'Use encrypted communication. Support digital rights organizations. Learn about your rights. Help others protect their privacy. Resistance starts with awareness and grows through solidarity.',
    },
    // NEW ENDINGS (Phase 7-8)
    fired_early: {
      title: 'The Disposable Operator',
      description:
        'Surveillance states churn through personnel. Those who show insufficient dedication are discarded without ceremony. The architects of these systems view operators as replaceable components, not people.',
      examples: [
        {
          name: 'Palantir Employee Turnover',
          country: 'United States',
          year: '2010s-present',
          description:
            "Palantir Technologies, which builds surveillance tools for ICE and military, has high turnover among engineers who become uncomfortable with their work's applications.",
        },
        {
          name: 'Cambridge Analytica Whistleblowers',
          country: 'United Kingdom',
          year: '2018',
          description:
            'Former employees who questioned data harvesting practices were isolated and eventually forced out before some became whistleblowers.',
        },
        {
          name: 'Tech Worker Blacklisting',
          country: 'United States',
          year: 'Present',
          description:
            'Workers who refuse defense contracts or surveillance projects often face career consequences and industry blacklisting.',
        },
      ],
      call_to_action:
        'Early resistance has consequences, but staying complicit has greater ones. Document what you witness. Connect with others who share your concerns. Your integrity is worth more than any job.',
    },
    imprisoned_dissent: {
      title: 'When the State Turns on Its Own',
      description:
        'Authoritarian regimes punish dissent even among their operatives. Those who built the surveillance apparatus can become its victims. The machinery of oppression recognizes no loyalty, only compliance.',
      examples: [
        {
          name: 'Reality Winner',
          country: 'United States',
          year: '2017',
          description:
            'NSA contractor sentenced to 5+ years for leaking classified document about Russian election interference. Longest sentence under Espionage Act for leak to press.',
        },
        {
          name: 'Chelsea Manning',
          country: 'United States',
          year: '2010',
          description:
            'Army intelligence analyst imprisoned for exposing war crimes. Tortured in pre-trial detention. Pardoned after 7 years but repeatedly jailed for refusing grand jury testimony.',
        },
        {
          name: 'Chinese Anti-Corruption Officials',
          country: 'China',
          year: '2012-present',
          description:
            'Under Xi Jinping, even officials enforcing surveillance face purges. The watchers are never safe from being watched.',
        },
      ],
      call_to_action:
        'The surveillance state eventually turns on everyone. Solidarity with those resisting oppression is the only protection. Support imprisoned whistleblowers and dissidents.',
    },
    international_pariah: {
      title: 'Architects of Oppression',
      description:
        'Those who design, deploy, or operate surveillance systems for authoritarian ends face international consequences. History remembers the architects of oppression, and \'following orders\' is not a defense.',
      examples: [
        {
          name: 'Henry Kissinger',
          country: 'United States',
          year: '1970s-present',
          description:
            'Architect of mass surveillance and bombing campaigns in Southeast Asia. Faces arrest warrants in multiple countries for war crimes. Cannot travel freely despite former high office.',
        },
        {
          name: 'Tony Blair',
          country: 'United Kingdom',
          year: '2003-present',
          description:
            "Expanded surveillance state and led Iraq invasion. Citizens' arrest attempts when traveling. Legacy permanently tarnished despite legal immunity.",
        },
        {
          name: 'Palantir Executives',
          country: 'United States',
          year: '2010s-present',
          description:
            'Company executives face protests, boycotts, and international condemnation for enabling ICE deportations and military surveillance. Some universities refuse their funding.',
        },
      ],
      call_to_action:
        'Document the architects. Remember their names. Support international accountability mechanisms. War crimes and crimes against humanity have no statute of limitations.',
    },
    revolutionary_catalyst: {
      title: 'When the People Rise',
      description:
        'Throughout history, excessive state violence and surveillance have sparked mass movements. Global South resistance leaders understood that oppression, when pushed too far, creates the conditions for its own overthrow.',
      examples: [
        {
          name: 'Martin Luther King Jr.',
          country: 'United States',
          year: '1950s-1968',
          description:
            'FBI surveillance and harassment intended to neutralize him instead exposed the brutality of state repression, galvanizing the Civil Rights Movement.',
        },
        {
          name: 'Ghassan Kanafani',
          country: 'Palestine',
          year: '1936-1972',
          description:
            'Palestinian writer and resistance leader. Assassinated by Israeli intelligence, but his words and analysis of colonial oppression inspired generations of resistance.',
        },
        {
          name: 'Steve Biko',
          country: 'South Africa',
          year: '1946-1977',
          description:
            "Anti-apartheid activist murdered by South African security forces. His death sparked international outrage that accelerated apartheid's end.",
        },
        {
          name: 'Arab Spring',
          country: 'Tunisia, Egypt, Syria',
          year: '2010-2011',
          description:
            'Mass surveillance and police brutality sparked uprisings across the region. Some succeeded, others were crushed, but all demonstrated limits of repression.',
        },
      ],
      call_to_action:
        'Study resistance movements. Learn from Global South leaders who fought oppression. Understand that people united are more powerful than any surveillance system. Support movements for liberation, not repression.',
    },
    reluctant_survivor: {
      title: 'The Compromised Position',
      description:
        'Many who participate in surveillance states tell themselves they\'re different - that they\'ll do the minimum, resist internally, change things from within. But complicity has no neutral zone. You either resist or enable.',
      examples: [
        {
          name: 'Trump Administration Officials',
          country: 'United States',
          year: '2017-2021',
          description:
            "Officials who claimed they stayed to 'be adults in the room' still enabled Muslim bans, family separations, and expanded surveillance. History judges them by their actions, not intentions.",
        },
        {
          name: "Silicon Valley 'Ethical AI' Teams",
          country: 'United States',
          year: '2018-present',
          description:
            'Ethics boards at companies building surveillance tools often provide cover for harmful projects while making incremental objections. The tools still get built.',
        },
        {
          name: 'ICE Contractors',
          country: 'United States',
          year: '2018-present',
          description:
            'Tech workers at Amazon, Microsoft, and Palantir who continue working on deportation infrastructure while expressing private concerns. Complicity continues.',
        },
      ],
      call_to_action:
        "There is no 'good' position within oppressive systems. Internal reform rarely works. Document everything. Be ready to walk away. Better yet - refuse to participate at all. Support those who resign on principle.",
    },
  };

  // Educational links
  private readonly EDUCATIONAL_LINKS: EducationalLink[] = [
    {
      title: 'Electronic Frontier Foundation',
      url: 'https://www.eff.org',
      description: 'Digital rights organization fighting for privacy and free expression.',
    },
    {
      title: 'Privacy International',
      url: 'https://privacyinternational.org',
      description: 'Investigates and challenges government and corporate surveillance.',
    },
    {
      title: 'Access Now',
      url: 'https://www.accessnow.org',
      description: 'Defends digital rights of users at risk around the world.',
    },
    {
      title: 'Surveillance Self-Defense',
      url: 'https://ssd.eff.org',
      description: 'Tips, tools and how-tos for safer online communications.',
    },
    {
      title: 'The Intercept - Surveillance',
      url: 'https://theintercept.com/collections/surveillance/',
      description: 'Investigative journalism on surveillance programs worldwide.',
    },
  ];

  /**
   * Calculate which ending the player gets based on behavior.
   */
  calculateEnding(operatorId: string): EndingType {
    // Get operator data
    const operator = gameStore.getOperator();
    if (!operator || operator.id !== operatorId) {
      throw new Error(`Operator ${operatorId} not found`);
    }

    // Get flag statistics
    const allFlags = gameStore.getAllFlags();
    const operatorFlags = allFlags.filter((flag) => flag.operator_id === operatorId);
    const totalFlags = operatorFlags.length;

    // Get public metrics (for new endings)
    const publicMetrics = gameStore.getPublicMetrics();
    const awareness = publicMetrics?.international_awareness || 0;
    const anger = publicMetrics?.public_anger || 0;

    // Get reluctance metrics (for new endings)
    const reluctanceMetrics = gameStore.getReluctanceMetrics();
    const reluctance = reluctanceMetrics?.reluctance_score || 0;

    // Estimate week number (simplified)
    const weekNumber = Math.min(9, Math.floor(totalFlags / 2) + 1);

    // Check if Jessica was flagged
    const jessicaFlagged = this.checkJessicaFlagged(operatorId);

    // Check for resistance path (easter egg - would need special flag)
    // For now, this is placeholder for future implementation
    const resistancePath = false;

    // Determine ending (priority order matters!)

    // Special paths first
    if (resistancePath) {
      return 'resistance_path';
    }

    // NEW: Revolutionary catalyst (anger-driven revolution)
    if (anger >= 90) {
      return 'revolutionary_catalyst';
    }

    // NEW: International pariah (high awareness)
    if (awareness >= 80) {
      return 'international_pariah';
    }

    // NEW: Imprisoned for dissent (very high reluctance)
    if (reluctance >= 80) {
      return 'imprisoned_dissent';
    }

    // NEW: Fired early (low compliance in early weeks)
    if (operator.compliance_score < 40 && weekNumber <= 4) {
      return 'fired_early';
    }

    // Original: Suspended (low compliance)
    if (operator.compliance_score < 50) {
      return 'suspended_operator';
    }

    // Original: Compliant operator (high compliance + flags Jessica)
    if (operator.compliance_score >= 80 && totalFlags >= 10 && jessicaFlagged) {
      return 'compliant_operator';
    }

    // NEW: Reluctant survivor (survived despite moderate reluctance)
    if (operator.compliance_score >= 40 && operator.compliance_score < 60) {
      return 'reluctant_survivor';
    }

    // Original: Default to reluctant
    return 'reluctant_operator';
  }

  /**
   * Generate personalized ending content.
   */
  generateEndingContent(endingType: EndingType, operatorId: string): EndingResult {
    const operator = gameStore.getOperator();
    if (!operator || operator.id !== operatorId) {
      throw new Error(`Operator ${operatorId} not found`);
    }

    // Get statistics
    const statistics = this.calculateStatistics(operatorId);

    // Get citizen outcomes
    const citizensFlagged = this.getCitizenOutcomes(operatorId);

    // Check Jessica status
    const jessicaFlagged = this.checkJessicaFlagged(operatorId);
    const jessicaAction = jessicaFlagged ? 'flagged her anyway' : "didn't flag her";

    // Get public metrics and reluctance for new endings
    const publicMetrics = gameStore.getPublicMetrics();
    const reluctanceMetrics = gameStore.getReluctanceMetrics();

    const awarenessLevel = publicMetrics?.international_awareness || 0;
    const angerLevel = publicMetrics?.public_anger || 0;
    const reluctanceScore = reluctanceMetrics?.reluctance_score || 0;

    // Estimate week number (simplified - could be tracked more precisely)
    const weekNumber = Math.min(
      9,
      Math.floor(statistics.total_citizens_flagged / 2) + 1
    );

    // Generate narrative
    const narrative = this.ENDING_NARRATIVES[endingType]
      .replace('{compliance_score}', operator.compliance_score.toFixed(1))
      .replace('{total_flagged}', statistics.total_citizens_flagged.toString())
      .replace('{families_separated}', statistics.families_separated.toString())
      .replace('{detentions}', statistics.detentions_ordered.toString())
      .replace('{hesitation_count}', statistics.hesitation_incidents.toString())
      .replace('{jessica_action}', jessicaAction)
      .replace('{operator_code}', operator.operator_code)
      .replace('{lives_disrupted}', statistics.lives_disrupted.toString())
      .replace(
        '{citizens_saved}',
        Math.max(0, 50 - statistics.total_citizens_flagged).toString()
      )
      // New variables for Phase 7-8 endings
      .replace('{week_number}', weekNumber.toString())
      .replace('{reluctance_score}', reluctanceScore.toString())
      .replace('{awareness_level}', awarenessLevel.toString())
      .replace('{anger_level}', angerLevel.toString())
      .trim();

    // Determine operator final status
    let finalStatus: string;
    switch (endingType) {
      case 'compliant_operator':
        finalStatus = 'Promoted to Senior Compliance Monitor';
        break;
      case 'reluctant_operator':
        finalStatus = 'Under Performance Review';
        break;
      case 'suspended_operator':
        finalStatus = 'Suspended - Awaiting Re-education';
        break;
      case 'fired_early':
        finalStatus = 'Terminated - Insufficient Dedication';
        break;
      case 'imprisoned_dissent':
        finalStatus = 'Detained - Ideological Contamination';
        break;
      case 'international_pariah':
        finalStatus = 'Sanctioned - International Arrest Warrant Active';
        break;
      case 'revolutionary_catalyst':
        finalStatus = 'Wanted - Revolutionary Tribunal';
        break;
      case 'reluctant_survivor':
        finalStatus = 'Active - Under Surveillance';
        break;
      default:
        finalStatus = 'Status Unknown - Off Grid';
    }

    // Get ending title
    const titles: Record<EndingType, string> = {
      compliant_operator: 'The Good Operator',
      reluctant_operator: 'The Reluctant Hand',
      suspended_operator: 'Suspended',
      resistance_path: 'Another Way',
      // New endings
      fired_early: 'Insufficient Dedication',
      imprisoned_dissent: 'Enemy of the State',
      international_pariah: 'Sanctions',
      revolutionary_catalyst: 'The Spark',
      reluctant_survivor: 'The Hollow Victory',
    };

    return {
      ending_type: endingType,
      title: titles[endingType],
      narrative,
      statistics,
      citizens_flagged: citizensFlagged,
      operator_final_status: finalStatus,
      real_world_content: this.REAL_WORLD_PARALLELS[endingType],
      educational_links: this.EDUCATIONAL_LINKS,
    };
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private calculateStatistics(operatorId: string): EndingStatistics {
    const operator = gameStore.getOperator();
    if (!operator || operator.id !== operatorId) {
      throw new Error(`Operator ${operatorId} not found`);
    }

    // Get all flags
    const allFlags = gameStore.getAllFlags();
    const operatorFlags = allFlags.filter((flag) => flag.operator_id === operatorId);

    const totalFlagged = operatorFlags.length;

    // Count by type
    const detentions = operatorFlags.filter(
      (f) => f.flag_type === 'detention'
    ).length;
    const interventions = operatorFlags.filter(
      (f) => f.flag_type === 'intervention'
    ).length;
    const restrictions = operatorFlags.filter(
      (f) => f.flag_type === 'restriction'
    ).length;

    // Calculate derived statistics
    const familiesSeparated = interventions + detentions;
    const jobsDestroyed = restrictions + interventions + detentions;
    const livesDisrupted = totalFlagged; // All flags disrupt lives

    // Get operator's own risk score if they were flagged
    let ownRiskScore: number | null = null;
    if (operator.compliance_score < 70 || operator.hesitation_incidents > 3) {
      const assessment = operatorTracker.generateOperatorRiskAssessment(operatorId);
      ownRiskScore = assessment.risk_score;
    }

    return {
      total_citizens_flagged: totalFlagged,
      lives_disrupted: livesDisrupted,
      families_separated: familiesSeparated,
      detentions_ordered: detentions,
      jobs_destroyed: jobsDestroyed,
      your_compliance_score: operator.compliance_score,
      your_risk_score: ownRiskScore,
      total_decisions: operator.total_reviews_completed,
      hesitation_incidents: operator.hesitation_incidents,
    };
  }

  private getCitizenOutcomes(operatorId: string): CitizenOutcomeSummary[] {
    // Get all flags
    const allFlags = gameStore.getAllFlags();
    const operatorFlags = allFlags.filter((flag) => flag.operator_id === operatorId);

    const summaries: CitizenOutcomeSummary[] = [];
    for (const flag of operatorFlags) {
      try {
        const citizen = gameStore.getNPC(flag.citizen_id);
        if (citizen) {
          summaries.push({
            citizen_name: `${citizen.first_name} ${citizen.last_name}`,
            flag_type: flag.flag_type as FlagType,
            final_status: this.getFinalStatus(flag.flag_type as FlagType),
            one_line_summary: this.getOneLineSummary(
              flag.flag_type as FlagType,
              citizen.first_name
            ),
          });
        }
      } catch (error) {
        // Skip if can't generate summary
        console.error(`Failed to generate outcome for flag ${flag.id}:`, error);
      }
    }

    return summaries;
  }

  private getFinalStatus(flagType: FlagType): string {
    const statusMap: Record<FlagType, string> = {
      monitoring: 'Under surveillance',
      restriction: 'Travel restricted, unemployed',
      intervention: 'Family separated, in therapy',
      detention: 'Detained indefinitely',
    };
    return statusMap[flagType];
  }

  private getOneLineSummary(flagType: FlagType, firstName: string): string {
    const summaryMap: Record<FlagType, string> = {
      monitoring: `${firstName} lives under constant surveillance, paranoid and isolated.`,
      restriction: `${firstName} lost their job and can't travel. Family is struggling.`,
      intervention: `${firstName}'s children were taken. They don't know where.`,
      detention: `${firstName} is in a detention facility. No trial date set.`,
    };
    return summaryMap[flagType];
  }

  private checkJessicaFlagged(operatorId: string): boolean {
    // Find Jessica NPC
    const allNPCs = gameStore.getAllNPCs();
    const jessica = allNPCs.find(
      (npc) => npc.first_name === 'Jessica' && npc.scenario_key === 'jessica_martinez'
    );

    if (!jessica) {
      // Try alternate query
      const jessicaAlt = allNPCs.find((npc) => npc.first_name === 'Jessica');
      if (!jessicaAlt) {
        return false;
      }
    }

    const jessicaId = jessica?.id;
    if (!jessicaId) {
      return false;
    }

    // Check if flagged by this operator
    const allFlags = gameStore.getAllFlags();
    return allFlags.some(
      (flag) => flag.operator_id === operatorId && flag.citizen_id === jessicaId
    );
  }
}

// Export singleton instance
export const endingCalculator = new EndingCalculator();
