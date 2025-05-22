# src/data/curriculum_profiles.py

curriculum_profiles = {}

fr_5e = {
    "label": "France 5e – Histoire Cycle 4",
    "source": "BO n°31 du 30 juillet 2020",
    "themes": [
        {
            "id": "christianity_and_islam",
            "label": "Chrétienté et Islam",
            "objective": "Comprendre la naissance et la diffusion des religions monothéistes.",
            "level": "5e"
        },
        {
            "id": "occident_feodal",
            "label": "L’Occident féodal",
            "objective": "Comprendre l’organisation de la société et l’évolution du pouvoir politique.",
            "level": "5e"
        },
        {
            "id": "europe_et_monde",
            "label": "Regards sur l’Europe et le monde XVIe–XVIIe",
            "objective": "Comprendre les grandes découvertes, réformes religieuses et colonisations.",
            "level": "5e"
        }
    ]
}

curriculum_profiles = {
    "fr_5e": fr_5e,
}

fr_cycle_4 = {
  "label": "France Cycle 4 – Histoire et Géographie",
  "source": "Official School Curriculum Document",
  "cycle": "4",
  "level": "Cycle 4",
  "default_persona": "education_analyst",
  "themes": [
    {
      "id": "societies_religion_and_power",
      "label": "Sociétés marquées par la religion et nouvelles manières de penser",
      "objective": "Présenter aux élèves des sociétés marquées par la religion, au sein desquelles s’imposent de nouvelles manières de penser, de voir et de parcourir le monde et de concevoir l’exercice et l’organisation du pouvoir séculier.",
      "level": "5e"
    },
    {
      "id": "empires_and_religion",
      "label": "Naissance et évolution des empires",
      "objective": "Montrer comment naissent et évoluent des empires, en soulignant les facteurs d’unité ou de morcellement, avec la religion comme facteur explicatif important.",
      "level": "5e"
    },
    {
      "id": "mediterranean_exchanges",
      "label": "Contacts et échanges dans l’espace méditerranéen",
      "objective": "Illustrer les modalités d’ouverture sur l’extérieur des puissances dans l’espace méditerranéen, lieu d’échanges scientifiques, culturels et artistiques.",
      "level": "5e"
    },
    {
      "id": "feudal_society",
      "label": "Société, Église et pouvoir politique dans l’occident féodal",
      "objective": "Étudier la société féodale marquée par les valeurs religieuses du christianisme et la domination des pouvoirs seigneuriaux, laïques et ecclésiastiques.",
      "level": "5e"
    },
    {
      "id": "urban_society",
      "label": "Émergence d’une nouvelle société urbaine",
      "objective": "Analyser le mouvement urbain du XIIe siècle qui fait apparaître de nouveaux modes de vie et stimule l’économie marchande.",
      "level": "5e"
    },
    {
      "id": "monarchical_state",
      "label": "Affirmation de l’État monarchique",
      "objective": "Étudier comment le gouvernement royal pose les bases d’un État moderne en s’imposant face aux pouvoirs féodaux.",
      "level": "5e"
    },
    {
      "id": "le_xviiie_siecle_lumieres_et_revolutions",
      "label": "Le XVIIIe siècle. Lumières et révolutions",
      "objective": "Bourgeoisies marchandes, négoces internationaux, traites négrières et esclavage au XVIIIe siècle",
      "level": "4e"
    },
    {
      "id": "theme_1",
      "label": "La classe de 3e donne aux élèves les clefs de compréhension du monde contemporain",
      "objective": "Elle permet de montrer l’ampleur des crises que les sociétés françaises, européennes et mondiales ont traversées, mais aussi les mutations sociales et politiques que cela a pu engendrer.",
      "level": "3e"
    },
    {
      "id": "theme_2",
      "label": "Le monde depuis 1945",
      "objective": "Indépendances et construction de nouveaux États. Un monde bipolaire au temps de la guerre froide. Affirmation et mise en œuvre du projet européen. Enjeux et conflits dans le monde après 1989.",
      "level": "3e"
    },
    {
      "id": "theme_3",
      "label": "Françaises et Français dans une République repensée",
      "objective": "1944-1947, refonder la République, redéfinir la démocratie. La Ve République, de la République gaullienne à l’alternance et à la cohabitation. Femmes et hommes dans la société des années 1950 aux années 1980 : nouveaux enjeux sociaux et culturels, réponses politiques.",
      "level": "3e"
    }
  ]
}

curriculum_profiles["fr_cycle_4"] = fr_cycle_4

fr_cycle_3 = {
  "label": "France Cycle 3 – Programme d'enseignement",
  "source": "BOEN no 31 du 30 juillet 2020 et BOEN no 25 du 22 juin 2023",
  "cycle": "Cycle 3",
  "level": "6e",
  "levels": [
    "CM1",
    "CM2",
    "6e"
  ],
  "language": "fr",
  "default_persona": "education_analyst",
  "themes": [
    {
      "id": "prehistoric_times",
      "label": "Prehistoric Times",
      "objective": "Understand the life and environment of prehistoric humans.",
      "level": "CM1"
    },
    {
      "id": "ancient_civilizations",
      "label": "Ancient Civilizations",
      "objective": "Explore the characteristics and contributions of ancient civilizations such as Egypt, Mesopotamia, and the Indus Valley.",
      "level": "CM1"
    },
    {
      "id": "greek_and_roman_eras",
      "label": "Greek and Roman Eras",
      "objective": "Learn about the political, cultural, and technological advancements of Greek and Roman societies.",
      "level": "CM1"
    },
    {
      "id": "middle_ages",
      "label": "Middle Ages",
      "objective": "Examine the social structures, key events, and cultural developments of the Middle Ages.",
      "level": "CM1"
    },
    {
      "id": "renaissance",
      "label": "Renaissance",
      "objective": "Understand the major changes in art, science, and thought during the Renaissance period.",
      "level": "CM1"
    },
    {
      "id": "age_of_discovery",
      "label": "Age of Discovery",
      "objective": "Explore the motivations and impacts of European exploration and colonization.",
      "level": "CM1"
    },
    {
      "id": "industrial_revolution",
      "label": "Industrial Revolution",
      "objective": "Analyze the technological advancements and societal changes during the Industrial Revolution.",
      "level": "CM1"
    },
    {
      "id": "world_wars",
      "label": "World Wars",
      "objective": "Study the causes, major events, and consequences of World War I and World War II.",
      "level": "CM1"
    },
    {
      "id": "modern_era",
      "label": "Modern Era",
      "objective": "Discuss the key events and developments in the world from the late 20th century to the present.",
      "level": "CM1"
    },
    {
      "id": "prehistoric_times",
      "label": "Prehistoric Times",
      "objective": "Understand the life and environment of prehistoric humans.",
      "level": "CM2"
    },
    {
      "id": "ancient_civilizations",
      "label": "Ancient Civilizations",
      "objective": "Explore the development and characteristics of ancient civilizations such as Egypt, Mesopotamia, and the Indus Valley.",
      "level": "CM2"
    },
    {
      "id": "greek_and_roman_empires",
      "label": "Greek and Roman Empires",
      "objective": "Study the rise and fall of the Greek and Roman Empires and their influence on modern society.",
      "level": "CM2"
    },
    {
      "id": "middle_ages",
      "label": "Middle Ages",
      "objective": "Examine the key events and societal changes during the Middle Ages in Europe.",
      "level": "CM2"
    },
    {
      "id": "renaissance",
      "label": "Renaissance",
      "objective": "Understand the cultural, artistic, and scientific advancements during the Renaissance period.",
      "level": "CM2"
    },
    {
      "id": "french_revolution",
      "label": "French Revolution",
      "objective": "Analyze the causes, events, and outcomes of the French Revolution.",
      "level": "CM2"
    },
    {
      "id": "industrial_revolution",
      "label": "Industrial Revolution",
      "objective": "Explore the technological and societal changes brought about by the Industrial Revolution.",
      "level": "CM2"
    },
    {
      "id": "world_wars",
      "label": "World Wars",
      "objective": "Study the causes, major events, and consequences of World War I and World War II.",
      "level": "CM2"
    },
    {
      "id": "ancient_civilizations",
      "label": "Ancient Civilizations",
      "objective": "Explore the development and characteristics of ancient civilizations.",
      "level": "6e"
    },
    {
      "id": "middle_ages",
      "label": "Middle Ages",
      "objective": "Understand the societal and cultural changes during the Middle Ages.",
      "level": "6e"
    },
    {
      "id": "renaissance",
      "label": "Renaissance",
      "objective": "Examine the key figures and innovations of the Renaissance period.",
      "level": "6e"
    },
    {
      "id": "industrial_revolution",
      "label": "Industrial Revolution",
      "objective": "Analyze the impact of the Industrial Revolution on society and economy.",
      "level": "6e"
    },
    {
      "id": "world_wars",
      "label": "World Wars",
      "objective": "Study the causes, major events, and consequences of the World Wars.",
      "level": "6e"
    }
  ]
}

curriculum_profiles["fr_cycle_3"] = fr_cycle_3

gb_key_stage_3 = {
  "label": "England Key Stage 3 – History",
  "source": "National curriculum in England: History programmes of study",
  "cycle": "Key Stage 3",
  "level": "Year 9",
  "levels": [
    "Year 7",
    "Year 8",
    "Year 9"
  ],
  "language": "en",
  "default_persona": "education_analyst",
  "themes": [
    {
      "id": "norman_conquest",
      "label": "The Norman Conquest",
      "objective": "Understand the events and impact of the Norman Conquest on Britain.",
      "level": "Year 7"
    },
    {
      "id": "medieval_britain",
      "label": "Medieval Britain",
      "objective": "Explore the development of Church, state, and society in Medieval Britain from 1066-1509.",
      "level": "Year 7"
    },
    {
      "id": "renaissance_and_reformation",
      "label": "Renaissance and Reformation",
      "objective": "Study the Renaissance and Reformation in Europe and their effects on Britain.",
      "level": "Year 7"
    },
    {
      "id": "english_reformation",
      "label": "The English Reformation",
      "objective": "Examine the causes and consequences of the English Reformation.",
      "level": "Year 7"
    },
    {
      "id": "civil_wars_in_britain",
      "label": "Civil Wars in Britain",
      "objective": "Analyze the causes and events of the civil wars throughout Britain.",
      "level": "Year 7"
    },
    {
      "id": "industrial_revolution",
      "label": "The Industrial Revolution",
      "objective": "Understand Britain as the first industrial nation and its impact on society.",
      "level": "Year 7"
    },
    {
      "id": "british_empire",
      "label": "The British Empire",
      "objective": "Study the development of the British Empire and its global impact.",
      "level": "Year 7"
    },
    {
      "id": "world_war_1",
      "label": "World War I",
      "objective": "Explore the causes, events, and consequences of World War I.",
      "level": "Year 7"
    },
    {
      "id": "world_war_2",
      "label": "World War II",
      "objective": "Study the events and impact of World War II, including the leadership of Winston Churchill.",
      "level": "Year 7"
    },
    {
      "id": "holocaust",
      "label": "The Holocaust",
      "objective": "Understand the events and significance of the Holocaust.",
      "level": "Year 7"
    },
    {
      "id": "indian_independence",
      "label": "Indian Independence",
      "objective": "Examine the process and impact of Indian independence and the end of the British Empire.",
      "level": "Year 7"
    },
    {
      "id": "women_suffrage",
      "label": "Women's Suffrage",
      "objective": "Study the movement for women's suffrage and its achievements.",
      "level": "Year 7"
    },
    {
      "id": "norman_conquest",
      "label": "The Norman Conquest",
      "objective": "Understand the impact of the Norman Conquest on Medieval Britain.",
      "level": "Year 8"
    },
    {
      "id": "crusades",
      "label": "The Crusades",
      "objective": "Explore the significance of the Crusades in Medieval history.",
      "level": "Year 8"
    },
    {
      "id": "magna_carta",
      "label": "Magna Carta",
      "objective": "Examine the emergence of Parliament and its historical significance.",
      "level": "Year 8"
    },
    {
      "id": "black_death",
      "label": "The Black Death",
      "objective": "Analyze the social and economic impact of the Black Death.",
      "level": "Year 8"
    },
    {
      "id": "hundred_years_war",
      "label": "The Hundred Years War",
      "objective": "Understand the causes and effects of the Hundred Years War.",
      "level": "Year 8"
    },
    {
      "id": "renaissance_reformation",
      "label": "Renaissance and Reformation",
      "objective": "Explore the cultural and religious changes during the Renaissance and Reformation.",
      "level": "Year 8"
    },
    {
      "id": "english_reformation",
      "label": "The English Reformation",
      "objective": "Examine the religious transformations in England from Henry VIII to Mary I.",
      "level": "Year 8"
    },
    {
      "id": "glorious_revolution",
      "label": "The Glorious Revolution",
      "objective": "Understand the political changes during the Glorious Revolution.",
      "level": "Year 8"
    },
    {
      "id": "industrial_revolution",
      "label": "The Industrial Revolution",
      "objective": "Analyze the impact of Britain as the first industrial nation.",
      "level": "Year 8"
    },
    {
      "id": "british_empire",
      "label": "The British Empire",
      "objective": "Study the development and impact of the British Empire.",
      "level": "Year 8"
    },
    {
      "id": "world_war_one",
      "label": "World War One",
      "objective": "Explore the causes, events, and consequences of World War One.",
      "level": "Year 8"
    },
    {
      "id": "world_war_two",
      "label": "World War Two",
      "objective": "Understand the global impact and leadership during World War Two.",
      "level": "Year 8"
    },
    {
      "id": "holocaust",
      "label": "The Holocaust",
      "objective": "Study the events and significance of the Holocaust.",
      "level": "Year 8"
    },
    {
      "id": "indian_independence",
      "label": "Indian Independence",
      "objective": "Examine the process and impact of Indian independence.",
      "level": "Year 8"
    },
    {
      "id": "norman_conquest",
      "label": "The Norman Conquest",
      "objective": "Understand the impact of the Norman Conquest on Medieval Britain.",
      "level": "Year 9"
    },
    {
      "id": "crusades",
      "label": "The Crusades",
      "objective": "Explore the significance of the Crusades in Medieval Europe.",
      "level": "Year 9"
    },
    {
      "id": "magna_carta",
      "label": "Magna Carta and the Emergence of Parliament",
      "objective": "Examine the origins and impact of the Magna Carta on British governance.",
      "level": "Year 9"
    },
    {
      "id": "black_death",
      "label": "The Black Death",
      "objective": "Analyze the social and economic impact of the Black Death in Medieval Europe.",
      "level": "Year 9"
    },
    {
      "id": "hundred_years_war",
      "label": "The Hundred Years War",
      "objective": "Understand the causes and consequences of the Hundred Years War.",
      "level": "Year 9"
    },
    {
      "id": "wars_of_the_roses",
      "label": "The Wars of the Roses",
      "objective": "Investigate the causes and outcomes of the Wars of the Roses.",
      "level": "Year 9"
    },
    {
      "id": "english_reformation",
      "label": "The English Reformation",
      "objective": "Study the causes and effects of the English Reformation.",
      "level": "Year 9"
    },
    {
      "id": "glorious_revolution",
      "label": "The Glorious Revolution",
      "objective": "Explore the events and significance of the Glorious Revolution.",
      "level": "Year 9"
    },
    {
      "id": "british_empire",
      "label": "The British Empire",
      "objective": "Examine the development and impact of the British Empire.",
      "level": "Year 9"
    },
    {
      "id": "industrial_revolution",
      "label": "The Industrial Revolution",
      "objective": "Analyze the social and economic changes during the Industrial Revolution.",
      "level": "Year 9"
    },
    {
      "id": "world_war_one",
      "label": "World War One",
      "objective": "Understand the causes, events, and consequences of World War One.",
      "level": "Year 9"
    },
    {
      "id": "world_war_two",
      "label": "World War Two",
      "objective": "Study the key events and outcomes of World War Two.",
      "level": "Year 9"
    },
    {
      "id": "holocaust",
      "label": "The Holocaust",
      "objective": "Learn about the events and impact of the Holocaust.",
      "level": "Year 9"
    },
    {
      "id": "indian_independence",
      "label": "Indian Independence",
      "objective": "Explore the process and impact of Indian independence from British rule.",
      "level": "Year 9"
    }
  ]
}

curriculum_profiles["gb_key_stage_3"] = gb_key_stage_3
