// Лиги и клубы. Составы лиг примерные (по состоянию на 2025/26) — правь свободно.
// Формат клуба: [название, короткое (3 буквы), репутация 1–100, стадион (тыс. мест)]
// rr: сколько раз команды играют друг с другом; up/down: связь с другой лигой (повышение/вылет)

export const LEAGUES = [
  {
    id: 'ENG1', name: 'Премьер-лига', country: 'ENG', tier: 1, rr: 2, tv: 2.6, down: 'ENG2', moves: 3,
    euro: { ucl: 4, uel: 2, uecl: 1 },
    foreign: [['FRA', 5], ['BRA', 4], ['ESP', 3], ['POR', 3], ['NED', 3], ['BEL', 3], ['ARG', 2], ['GER', 2], ['NOR', 2], ['DEN', 2], ['SCO', 2], ['IRL', 2], ['WAL', 2], ['NGA', 2], ['GHA', 2], ['SEN', 2], ['CIV', 2], ['JPN', 1], ['KOR', 1], ['USA', 1], ['COL', 1], ['URU', 1], ['UKR', 1], ['SUI', 1], ['SWE', 1], ['CRO', 1], ['MAR', 1], ['EGY', 1], ['SRB', 1], ['CMR', 1]],
    clubs: [
      ['Arsenal', 'ARS', 92, 60], ['Liverpool', 'LIV', 93, 61], ['Manchester City', 'MCI', 93, 53], ['Chelsea', 'CHE', 88, 40],
      ['Manchester United', 'MUN', 86, 74], ['Tottenham', 'TOT', 84, 62], ['Newcastle', 'NEW', 85, 52], ['Aston Villa', 'AVL', 84, 42],
      ['Brighton', 'BHA', 79, 31], ['Nottingham Forest', 'NFO', 78, 30], ['Crystal Palace', 'CRY', 78, 25], ['Bournemouth', 'BOU', 77, 11],
      ['Brentford', 'BRE', 77, 17], ['Fulham', 'FUL', 76, 29], ['West Ham', 'WHU', 77, 62], ['Everton', 'EVE', 76, 52],
      ['Wolverhampton', 'WOL', 74, 32], ['Leeds United', 'LEE', 73, 37], ['Sunderland', 'SUN', 72, 49], ['Burnley', 'BUR', 71, 22],
    ],
  },
  {
    id: 'ENG2', name: 'Чемпионшип', country: 'ENG', tier: 2, rr: 2, tv: 0.4, up: 'ENG1', moves: 3,
    foreign: [['SCO', 4], ['IRL', 4], ['WAL', 4], ['NIR', 3], ['NED', 2], ['FRA', 2], ['BEL', 2], ['DEN', 2], ['NGA', 2], ['JAM', 2], ['USA', 1], ['AUS', 1], ['GHA', 1], ['POR', 1], ['ESP', 1]],
    clubs: [
      ['Leicester City', 'LEI', 72, 32], ['Southampton', 'SOU', 72, 32], ['Ipswich Town', 'IPS', 71, 30], ['Sheffield United', 'SHU', 69, 32],
      ['Middlesbrough', 'MID', 68, 34], ['Coventry City', 'COV', 68, 32], ['Norwich City', 'NOR', 67, 27], ['West Bromwich', 'WBA', 67, 26],
      ['Watford', 'WAT', 65, 22], ['Millwall', 'MIL', 64, 20], ['Hull City', 'HUL', 64, 25], ['Bristol City', 'BRC', 64, 27],
      ['Stoke City', 'STK', 64, 30], ['Swansea City', 'SWA', 63, 21], ['Preston', 'PNE', 62, 23], ['Queens Park Rangers', 'QPR', 62, 18],
      ['Blackburn Rovers', 'BLB', 62, 31], ['Derby County', 'DER', 63, 33], ['Portsmouth', 'POR', 62, 21], ['Birmingham City', 'BIR', 66, 30],
      ['Wrexham', 'WRX', 64, 13], ['Charlton', 'CHA', 60, 27], ['Oxford United', 'OXF', 58, 12], ['Sheffield Wednesday', 'SHW', 59, 39],
    ],
  },
  {
    id: 'ESP1', name: 'Ла Лига', country: 'ESP', tier: 1, rr: 2, tv: 1.6,
    euro: { ucl: 4, uel: 2, uecl: 1 },
    foreign: [['ARG', 4], ['FRA', 3], ['BRA', 3], ['URU', 2], ['POR', 2], ['COL', 1], ['MAR', 2], ['NED', 1], ['GER', 1], ['BEL', 1], ['SEN', 1], ['NGA', 1], ['CRO', 1], ['ENG', 1], ['JPN', 1], ['MEX', 1], ['ECU', 1], ['PAR', 1], ['VEN', 1], ['TUR', 1], ['UKR', 1], ['POL', 1]],
    clubs: [
      ['Real Madrid', 'RMA', 95, 83], ['Barcelona', 'BAR', 93, 99], ['Atlético Madrid', 'ATM', 88, 70], ['Athletic Club', 'ATH', 81, 53],
      ['Villarreal', 'VIL', 80, 23], ['Real Betis', 'BET', 79, 60], ['Real Sociedad', 'RSO', 78, 40], ['Celta Vigo', 'CEL', 75, 29],
      ['Sevilla', 'SEV', 76, 43], ['Girona', 'GIR', 74, 14], ['Valencia', 'VAL', 74, 49], ['Osasuna', 'OSA', 73, 23],
      ['Rayo Vallecano', 'RAY', 73, 15], ['Mallorca', 'MLL', 72, 23], ['Getafe', 'GET', 72, 17], ['Espanyol', 'ESP', 72, 40],
      ['Alavés', 'ALA', 71, 20], ['Levante', 'LEV', 69, 26], ['Elche', 'ELC', 69, 33], ['Real Oviedo', 'OVI', 68, 30],
    ],
  },
  {
    id: 'ITA1', name: 'Серия А', country: 'ITA', tier: 1, rr: 2, tv: 1.3,
    euro: { ucl: 4, uel: 2, uecl: 1 },
    foreign: [['FRA', 3], ['ARG', 3], ['BRA', 2], ['NED', 2], ['SRB', 2], ['CRO', 2], ['POL', 2], ['DEN', 2], ['ESP', 2], ['BEL', 2], ['POR', 1], ['SUI', 1], ['URU', 1], ['NGA', 1], ['CIV', 1], ['SEN', 1], ['GER', 1], ['ENG', 1], ['USA', 1], ['UKR', 1], ['SVK', 1], ['ALB', 1], ['GEO', 1], ['TUR', 1], ['SWE', 1], ['NOR', 1], ['AUT', 1]],
    clubs: [
      ['Inter', 'INT', 90, 75], ['Napoli', 'NAP', 87, 54], ['Milan', 'MIL', 86, 75], ['Juventus', 'JUV', 86, 41],
      ['Atalanta', 'ATA', 84, 24], ['Roma', 'ROM', 82, 70], ['Lazio', 'LAZ', 79, 70], ['Bologna', 'BOL', 79, 36],
      ['Como', 'COM', 77, 13], ['Fiorentina', 'FIO', 77, 43], ['Torino', 'TOR', 73, 28], ['Udinese', 'UDI', 72, 25],
      ['Genoa', 'GEN', 71, 36], ['Sassuolo', 'SAS', 70, 21], ['Cagliari', 'CAG', 70, 16], ['Parma', 'PAR', 70, 22],
      ['Lecce', 'LEC', 68, 31], ['Hellas Verona', 'VER', 68, 31], ['Cremonese', 'CRE', 67, 16], ['Pisa', 'PIS', 66, 10],
    ],
  },
  {
    id: 'GER1', name: 'Бундеслига', country: 'GER', tier: 1, rr: 2, tv: 1.2,
    euro: { ucl: 4, uel: 2, uecl: 1 },
    foreign: [['AUT', 3], ['FRA', 3], ['NED', 2], ['SUI', 2], ['DEN', 2], ['JPN', 2], ['POL', 1], ['CRO', 1], ['ENG', 2], ['USA', 1], ['BEL', 1], ['ESP', 1], ['POR', 1], ['BRA', 1], ['KOR', 1], ['CIV', 1], ['NGA', 1], ['GHA', 1], ['SWE', 1], ['NOR', 1], ['CZE', 1], ['HUN', 1], ['UKR', 1], ['TUR', 1], ['CAN', 1], ['MAR', 1]],
    clubs: [
      ['Bayern München', 'FCB', 94, 75], ['Bayer Leverkusen', 'B04', 86, 30], ['Borussia Dortmund', 'BVB', 87, 81], ['RB Leipzig', 'RBL', 84, 47],
      ['Eintracht Frankfurt', 'SGE', 81, 58], ['VfB Stuttgart', 'VFB', 81, 60], ['SC Freiburg', 'SCF', 77, 34], ['Borussia M\'gladbach', 'BMG', 75, 54],
      ['VfL Wolfsburg', 'WOB', 75, 30], ['Mainz 05', 'M05', 74, 33], ['TSG Hoffenheim', 'TSG', 74, 30], ['Werder Bremen', 'SVW', 73, 42],
      ['Union Berlin', 'FCU', 73, 22], ['FC Augsburg', 'FCA', 71, 30], ['1. FC Köln', 'KOE', 71, 50], ['Hamburger SV', 'HSV', 71, 57],
      ['FC St. Pauli', 'STP', 69, 30], ['1. FC Heidenheim', 'FCH', 68, 15],
    ],
  },
  {
    id: 'FRA1', name: 'Лига 1', country: 'FRA', tier: 1, rr: 2, tv: 0.8,
    euro: { ucl: 3, uel: 2, uecl: 1 },
    foreign: [['SEN', 3], ['CIV', 3], ['MLI', 2], ['CMR', 2], ['MAR', 2], ['ALG', 2], ['BRA', 2], ['POR', 2], ['BEL', 2], ['GUI', 2], ['COD', 2], ['ARG', 1], ['ESP', 1], ['NED', 1], ['SUI', 1], ['TUN', 1], ['BFA', 1], ['GAB', 1], ['DEN', 1], ['USA', 1], ['KOR', 1], ['JPN', 1], ['GEO', 1], ['UKR', 1], ['NGA', 1]],
    clubs: [
      ['Paris Saint-Germain', 'PSG', 94, 48], ['Olympique Marseille', 'OM', 83, 67], ['AS Monaco', 'ASM', 82, 18], ['LOSC Lille', 'LOS', 80, 50],
      ['Olympique Lyonnais', 'OL', 80, 59], ['OGC Nice', 'NCE', 78, 36], ['RC Lens', 'RCL', 77, 38], ['Stade Rennais', 'REN', 77, 30],
      ['RC Strasbourg', 'RCS', 76, 26], ['Stade Brestois', 'SB29', 72, 15], ['Toulouse', 'TFC', 72, 33], ['FC Nantes', 'FCN', 70, 35],
      ['AJ Auxerre', 'AJA', 68, 18], ['Angers SCO', 'SCO', 67, 19], ['Le Havre', 'HAC', 67, 25], ['FC Lorient', 'FCL', 67, 18],
      ['Paris FC', 'PFC', 69, 20], ['FC Metz', 'FCM', 66, 28],
    ],
  },
  {
    id: 'NED1', name: 'Эредивизи', country: 'NED', tier: 1, rr: 2, tv: 0.25,
    euro: { ucl: 2, uel: 1, uecl: 1 },
    foreign: [['BEL', 3], ['DEN', 2], ['NOR', 2], ['SWE', 2], ['GER', 2], ['MAR', 2], ['SUR', 2], ['CUW', 1], ['JPN', 1], ['MEX', 1], ['USA', 1], ['GHA', 1], ['NGA', 1], ['SEN', 1], ['BRA', 1], ['ARG', 1], ['POR', 1], ['UKR', 1], ['POL', 1], ['GRE', 1], ['ISL', 1]],
    clubs: [
      ['PSV', 'PSV', 83, 35], ['Feyenoord', 'FEY', 82, 47], ['Ajax', 'AJA', 82, 55], ['AZ Alkmaar', 'AZ', 77, 19],
      ['FC Twente', 'TWE', 75, 30], ['FC Utrecht', 'UTR', 73, 23], ['Go Ahead Eagles', 'GAE', 69, 10], ['NEC Nijmegen', 'NEC', 69, 12],
      ['sc Heerenveen', 'HEE', 68, 27], ['FC Groningen', 'GRO', 68, 22], ['Sparta Rotterdam', 'SPA', 66, 11], ['Fortuna Sittard', 'FOR', 65, 12],
      ['PEC Zwolle', 'PEC', 65, 14], ['Heracles Almelo', 'HER', 64, 12], ['NAC Breda', 'NAC', 64, 19], ['Excelsior', 'EXC', 62, 4],
      ['Telstar', 'TEL', 60, 5], ['FC Volendam', 'VOL', 61, 7],
    ],
  },
  {
    id: 'POR1', name: 'Примейра Лига', country: 'POR', tier: 1, rr: 2, tv: 0.25,
    euro: { ucl: 2, uel: 1, uecl: 1 },
    foreign: [['BRA', 7], ['ESP', 2], ['ARG', 2], ['URU', 1], ['COL', 1], ['CPV', 2], ['ANG', 1], ['GNB', 1], ['MOZ', 1], ['FRA', 1], ['SWE', 1], ['NOR', 1], ['DEN', 1], ['GRE', 1], ['TUR', 1], ['JPN', 1], ['NGA', 1], ['GHA', 1], ['MEX', 1], ['USA', 1], ['VEN', 1], ['UKR', 1], ['SRB', 1]],
    clubs: [
      ['Sporting CP', 'SCP', 85, 50], ['Benfica', 'SLB', 85, 64], ['FC Porto', 'FCP', 84, 50], ['SC Braga', 'SCB', 77, 30],
      ['Vitória SC', 'VSC', 71, 30], ['Famalicão', 'FAM', 68, 5], ['Gil Vicente', 'GIL', 66, 12], ['Moreirense', 'MOR', 65, 6],
      ['Casa Pia', 'CPA', 64, 9], ['Estoril Praia', 'EST', 66, 8], ['Rio Ave', 'RAV', 65, 12], ['Santa Clara', 'STC', 66, 12],
      ['FC Arouca', 'ARO', 64, 5], ['AVS', 'AVS', 62, 5], ['Estrela Amadora', 'EAM', 62, 9], ['Nacional', 'NAC', 62, 5],
      ['CD Tondela', 'TON', 60, 5], ['FC Alverca', 'ALV', 61, 7],
    ],
  },
  {
    id: 'TUR1', name: 'Суперлига', country: 'TUR', tier: 1, rr: 2, tv: 0.35,
    euro: { ucl: 1, uel: 1, uecl: 2 },
    foreign: [['BRA', 2], ['POR', 2], ['NGA', 2], ['SEN', 2], ['FRA', 1], ['ESP', 1], ['ARG', 1], ['URU', 1], ['COL', 1], ['BEL', 1], ['NED', 1], ['GER', 1], ['SRB', 1], ['CRO', 1], ['BIH', 1], ['MAR', 1], ['GHA', 1], ['CIV', 1], ['CMR', 1], ['POL', 1], ['CZE', 1], ['ROU', 1], ['UKR', 1], ['GEO', 1], ['ITA', 1], ['DEN', 1], ['SWE', 1], ['NOR', 1]],
    clubs: [
      ['Galatasaray', 'GS', 85, 52], ['Fenerbahçe', 'FB', 83, 47], ['Beşiktaş', 'BJK', 79, 42], ['Trabzonspor', 'TS', 75, 40],
      ['Başakşehir', 'IBFK', 72, 17], ['Göztepe', 'GOZ', 70, 20], ['Samsunspor', 'SAM', 70, 33], ['Eyüpspor', 'EYP', 67, 8],
      ['Kasımpaşa', 'KAS', 67, 14], ['Konyaspor', 'KON', 67, 42], ['Rizespor', 'RIZ', 66, 15], ['Antalyaspor', 'ANT', 66, 32],
      ['Alanyaspor', 'ALY', 66, 10], ['Kayserispor', 'KAY', 64, 32], ['Gaziantep FK', 'GFK', 65, 33], ['Kocaelispor', 'KOC', 64, 34],
      ['Gençlerbirliği', 'GEN', 63, 20], ['Fatih Karagümrük', 'FKG', 63, 15],
    ],
  },
  {
    id: 'UKR1', name: 'УПЛ', country: 'UKR', tier: 1, rr: 2, tv: 0.04,
    euro: { ucl: 1, uel: 1, uecl: 2 },
    foreign: [['BRA', 5], ['GEO', 2], ['NGA', 1], ['GHA', 1], ['SEN', 1], ['CIV', 1], ['POR', 1], ['SRB', 1], ['MDA', 1], ['BIH', 1], ['CRO', 1], ['COL', 1], ['ARG', 1], ['GUI', 1], ['BFA', 1], ['CMR', 1]],
    clubs: [
      ['Шахтар', 'ШАХ', 79, 35], ['Динамо Київ', 'ДИН', 78, 70], ['Полісся', 'ПОЛ', 69, 15], ['Олександрія', 'ОЛК', 66, 7],
      ['Кривбас', 'КРИ', 66, 29], ['Карпати', 'КАР', 65, 28], ['ЛНЗ', 'ЛНЗ', 64, 10], ['Зоря', 'ЗОР', 64, 23],
      ['Рух', 'РУХ', 63, 8], ['Верес', 'ВЕР', 62, 13], ['Оболонь', 'ОБО', 61, 5], ['Колос', 'КОЛ', 62, 5],
      ['Металіст 1925', 'МЕТ', 64, 40], ['Кудрівка', 'КУД', 58, 3], ['Епіцентр', 'ЕПІ', 59, 5], ['СК Полтава', 'ПЛТ', 57, 24],
    ],
  },
  {
    id: 'BEL1', name: 'Про Лига', country: 'BEL', tier: 1, rr: 2, tv: 0.15,
    euro: { ucl: 1, uel: 1, uecl: 2 },
    foreign: [['NED', 3], ['FRA', 3], ['NGA', 2], ['GHA', 2], ['SEN', 2], ['MLI', 1], ['CIV', 1], ['COD', 2], ['CMR', 1], ['DEN', 1], ['NOR', 1], ['SWE', 1], ['JPN', 2], ['BRA', 1], ['ARG', 1], ['SUI', 1], ['GER', 1], ['ESP', 1], ['POR', 1], ['MAR', 2], ['ALG', 1], ['ISL', 1], ['GEO', 1]],
    clubs: [
      ['Club Brugge', 'CLB', 81, 29], ['Union SG', 'USG', 78, 9], ['Anderlecht', 'AND', 77, 22], ['KRC Genk', 'GNK', 76, 23],
      ['KAA Gent', 'GNT', 74, 20], ['Royal Antwerp', 'ANT', 74, 16], ['Standard Liège', 'STA', 70, 27], ['KV Mechelen', 'KVM', 68, 16],
      ['Cercle Brugge', 'CER', 67, 29], ['Sint-Truiden', 'STV', 66, 14], ['Westerlo', 'WES', 66, 8], ['Charleroi', 'CHA', 67, 15],
      ['OH Leuven', 'OHL', 65, 10], ['FCV Dender', 'DEN', 62, 6], ['Zulte Waregem', 'ZWA', 63, 12], ['RAAL La Louvière', 'RAA', 60, 8],
    ],
  },
  {
    id: 'SCO1', name: 'Премьершип', country: 'SCO', tier: 1, rr: 3, tv: 0.08,
    euro: { ucl: 1, uel: 1, uecl: 2 },
    foreign: [['ENG', 6], ['IRL', 3], ['NIR', 2], ['AUS', 1], ['JPN', 2], ['KOR', 1], ['NED', 1], ['BEL', 1], ['DEN', 1], ['NOR', 1], ['SWE', 1], ['FRA', 1], ['POR', 1], ['NGA', 1], ['CAN', 1], ['USA', 1], ['WAL', 1], ['GRE', 1]],
    clubs: [
      ['Celtic', 'CEL', 79, 60], ['Rangers', 'RAN', 76, 51], ['Hearts', 'HEA', 69, 20], ['Hibernian', 'HIB', 67, 20],
      ['Aberdeen', 'ABE', 67, 20], ['Motherwell', 'MOT', 63, 13], ['Dundee United', 'DDU', 63, 14], ['St Mirren', 'SMI', 62, 8],
      ['Kilmarnock', 'KIL', 61, 18], ['Dundee', 'DUN', 61, 11], ['Falkirk', 'FAL', 60, 8], ['Livingston', 'LIV', 59, 10],
    ],
  },
  {
    id: 'BRA1', name: 'Серия А (Бразилия)', country: 'BRA', tier: 1, rr: 2, tv: 0.35,
    lib: 7,
    foreign: [['ARG', 4], ['URU', 3], ['COL', 3], ['PAR', 2], ['ECU', 2], ['CHI', 1], ['VEN', 1], ['PER', 1], ['BOL', 1], ['POR', 1]],
    clubs: [
      ['Flamengo', 'FLA', 83, 78], ['Palmeiras', 'PAL', 82, 43], ['Botafogo', 'BOT', 78, 46], ['Cruzeiro', 'CRU', 77, 61],
      ['São Paulo', 'SAO', 77, 66], ['Corinthians', 'COR', 76, 49], ['Fluminense', 'FLU', 76, 78], ['Atlético Mineiro', 'CAM', 77, 46],
      ['Internacional', 'INT', 76, 50], ['Grêmio', 'GRE', 75, 55], ['Bahia', 'BAH', 74, 50], ['Vasco da Gama', 'VAS', 73, 21],
      ['Fortaleza', 'FOR', 72, 63], ['Red Bull Bragantino', 'RBB', 72, 17], ['Santos', 'SAN', 73, 16], ['Mirassol', 'MIR', 69, 15],
      ['Ceará', 'CEA', 69, 63], ['Vitória', 'VIT', 68, 35], ['Juventude', 'JUV', 66, 19], ['Sport Recife', 'SPT', 67, 32],
    ],
  },
  {
    id: 'ARG1', name: 'Лига Професьональ', country: 'ARG', tier: 1, rr: 1, tv: 0.15,
    lib: 6,
    foreign: [['URU', 4], ['PAR', 3], ['COL', 3], ['CHI', 2], ['VEN', 1], ['PER', 1], ['BOL', 1], ['ECU', 1], ['BRA', 1]],
    clubs: [
      ['River Plate', 'RIV', 81, 85], ['Boca Juniors', 'BOC', 80, 54], ['Racing Club', 'RAC', 76, 51], ['Vélez Sarsfield', 'VEL', 73, 49],
      ['Estudiantes', 'EST', 74, 30], ['Talleres', 'TAL', 73, 57], ['Independiente', 'IND', 72, 52], ['San Lorenzo', 'SLO', 71, 47],
      ['Lanús', 'LAN', 71, 47], ['Rosario Central', 'ROS', 71, 41], ['Huracán', 'HUR', 70, 48], ['Argentinos Juniors', 'ARJ', 70, 26],
      ['Newell\'s Old Boys', 'NOB', 69, 42], ['Belgrano', 'BEL', 69, 30], ['Godoy Cruz', 'GOD', 68, 42], ['Defensa y Justicia', 'DYJ', 68, 18],
      ['Tigre', 'TIG', 67, 26], ['Platense', 'PLA', 67, 20], ['Unión', 'UNI', 67, 28], ['Gimnasia La Plata', 'GLP', 66, 24],
      ['Instituto', 'INS', 66, 26], ['Banfield', 'BAN', 66, 34], ['Independiente Rivadavia', 'IRV', 65, 24], ['Atlético Tucumán', 'ATU', 65, 35],
      ['Barracas Central', 'BAR', 63, 4], ['Central Córdoba', 'CCO', 64, 30], ['Sarmiento', 'SAR', 63, 22], ['Aldosivi', 'ALD', 62, 28],
      ['San Martín SJ', 'SMJ', 62, 19], ['Deportivo Riestra', 'RIE', 61, 3],
    ],
  },
  {
    id: 'USA1', name: 'MLS', country: 'USA', tier: 1, rr: 1, tv: 0.3,
    concacaf: 8,
    foreign: [['ARG', 4], ['CAN', 4], ['MEX', 2], ['COL', 2], ['URU', 1], ['VEN', 1], ['PAR', 1], ['BRA', 2], ['ENG', 2], ['ESP', 1], ['FRA', 1], ['GER', 1], ['JAM', 2], ['HON', 1], ['CRC', 1], ['PAN', 1], ['GHA', 1], ['NGA', 1], ['KOR', 1], ['JPN', 1], ['NZL', 1], ['ECU', 1], ['URU', 1], ['SCO', 1], ['DEN', 1]],
    clubs: [
      ['Inter Miami', 'MIA', 76, 21], ['LAFC', 'LAFC', 75, 22], ['Columbus Crew', 'CLB', 73, 20], ['LA Galaxy', 'LAG', 72, 27],
      ['FC Cincinnati', 'CIN', 73, 26], ['Seattle Sounders', 'SEA', 72, 37], ['Philadelphia Union', 'PHI', 72, 18], ['Vancouver Whitecaps', 'VAN', 72, 22],
      ['San Diego FC', 'SD', 71, 35], ['Orlando City', 'ORL', 70, 25], ['Charlotte FC', 'CLT', 70, 38], ['Nashville SC', 'NSH', 70, 30],
      ['New York City FC', 'NYC', 70, 28], ['Minnesota United', 'MIN', 70, 20], ['Portland Timbers', 'POR', 69, 25], ['Atlanta United', 'ATL', 69, 42],
      ['Austin FC', 'ATX', 68, 20], ['New York Red Bulls', 'RBNY', 69, 25], ['Real Salt Lake', 'RSL', 68, 20], ['Houston Dynamo', 'HOU', 68, 22],
      ['Chicago Fire', 'CHI', 68, 24], ['FC Dallas', 'DAL', 67, 20], ['Colorado Rapids', 'COL', 67, 18], ['St. Louis City', 'STL', 67, 22],
      ['Sporting KC', 'SKC', 66, 18], ['San Jose Earthquakes', 'SJ', 66, 18], ['New England Revolution', 'NE', 66, 65], ['CF Montréal', 'MTL', 65, 19],
      ['Toronto FC', 'TOR', 66, 30], ['D.C. United', 'DC', 65, 20],
    ],
  },
  {
    id: 'KSA1', name: 'Про Лига (Саудовская Аравия)', country: 'KSA', tier: 1, rr: 2, tv: 0.3,
    afc: 4,
    foreign: [['BRA', 4], ['POR', 3], ['FRA', 2], ['ESP', 1], ['MAR', 2], ['ALG', 1], ['SEN', 2], ['NGA', 1], ['CIV', 1], ['ARG', 1], ['COL', 1], ['CRO', 1], ['SRB', 1], ['NED', 1], ['BEL', 1], ['ENG', 1], ['EGY', 1], ['TUN', 1], ['GHA', 1], ['CMR', 1], ['ITA', 1], ['GER', 1]],
    clubs: [
      ['Al-Hilal', 'HIL', 82, 25], ['Al-Nassr', 'NAS', 81, 25], ['Al-Ittihad', 'ITT', 80, 62], ['Al-Ahli', 'AHL', 79, 62],
      ['Al-Qadsiah', 'QAD', 75, 15], ['Al-Ettifaq', 'ETT', 71, 15], ['Al-Taawoun', 'TAA', 70, 25], ['Al-Shabab', 'SHB', 70, 22],
      ['Al-Fateh', 'FAT', 67, 20], ['Al-Khaleej', 'KHA', 67, 10], ['Al-Fayha', 'FAY', 66, 7], ['Al-Riyadh', 'RIY', 64, 15],
      ['Al-Okhdood', 'OKH', 63, 10], ['Al-Kholood', 'KHO', 63, 10], ['Damac', 'DAM', 65, 15], ['Al-Hazem', 'HAZ', 63, 8],
      ['Al-Najma', 'NAJ', 62, 8], ['NEOM SC', 'NEO', 64, 10],
    ],
  },
];

// Клубы «фоновых» стран: играют в еврокубках и других международных турнирах.
// [название, короткое, репутация, страна, регион] регион: EU — Европа, SA — Южная Америка, AS — Азия, NA — КОНКАКАФ
export const BG_CLUBS = [
  ['Red Bull Salzburg', 'RBS', 76, 'AUT', 'EU'], ['Sturm Graz', 'STU', 71, 'AUT', 'EU'], ['Rapid Wien', 'RAP', 68, 'AUT', 'EU'],
  ['FC Basel', 'BAS', 71, 'SUI', 'EU'], ['Young Boys', 'YB', 72, 'SUI', 'EU'], ['Servette', 'SER', 66, 'SUI', 'EU'],
  ['Olympiacos', 'OLY', 76, 'GRE', 'EU'], ['PAOK', 'PAOK', 74, 'GRE', 'EU'], ['Panathinaikos', 'PAO', 72, 'GRE', 'EU'], ['AEK Athens', 'AEK', 72, 'GRE', 'EU'],
  ['Slavia Praha', 'SLA', 74, 'CZE', 'EU'], ['Sparta Praha', 'SPP', 72, 'CZE', 'EU'], ['Viktoria Plzeň', 'PLZ', 70, 'CZE', 'EU'],
  ['FC København', 'FCK', 73, 'DEN', 'EU'], ['FC Midtjylland', 'FCM', 72, 'DEN', 'EU'],
  ['Bodø/Glimt', 'BOD', 73, 'NOR', 'EU'], ['Molde', 'MOL', 67, 'NOR', 'EU'], ['Malmö FF', 'MAL', 68, 'SWE', 'EU'],
  ['Dinamo Zagreb', 'DZG', 73, 'CRO', 'EU'], ['Hajduk Split', 'HAJ', 67, 'CRO', 'EU'],
  ['Crvena zvezda', 'CZV', 74, 'SRB', 'EU'], ['Partizan', 'PAR', 67, 'SRB', 'EU'],
  ['Legia Warszawa', 'LEG', 68, 'POL', 'EU'], ['Lech Poznań', 'LPO', 68, 'POL', 'EU'],
  ['APOEL', 'APO', 63, 'CYP', 'EU'], ['Pafos FC', 'PAF', 66, 'CYP', 'EU'], ['Ferencváros', 'FTC', 70, 'HUN', 'EU'],
  ['Maccabi Tel Aviv', 'MTA', 67, 'ISR', 'EU'], ['FCSB', 'FCSB', 67, 'ROU', 'EU'], ['Ludogorets', 'LUD', 67, 'BUL', 'EU'],
  ['Qarabağ', 'QAR', 69, 'AZE', 'EU'], ['Kairat', 'KAI', 63, 'KAZ', 'EU'], ['Slovan Bratislava', 'SLO', 65, 'SVK', 'EU'],
  ['Celje', 'CEL', 63, 'SVN', 'EU'], ['Sheriff Tiraspol', 'SHE', 60, 'MDA', 'EU'], ['Shamrock Rovers', 'SHR', 60, 'IRL', 'EU'],
  ['Rakow', 'RAK', 66, 'POL', 'EU'], ['LASK', 'LASK', 66, 'AUT', 'EU'], ['Brøndby', 'BRO', 66, 'DEN', 'EU'], ['Rosenborg', 'RBK', 64, 'NOR', 'EU'],
  ['HJK Helsinki', 'HJK', 60, 'FIN', 'EU'], ['FC Lugano', 'LUG', 66, 'SUI', 'EU'],
  // Южная Америка
  ['Peñarol', 'PEN', 72, 'URU', 'SA'], ['Nacional', 'NAC', 71, 'URU', 'SA'],
  ['Atlético Nacional', 'ATN', 71, 'COL', 'SA'], ['Millonarios', 'MIL', 68, 'COL', 'SA'], ['Junior', 'JUN', 68, 'COL', 'SA'], ['Independiente Santa Fe', 'ISF', 66, 'COL', 'SA'],
  ['Colo-Colo', 'CC', 69, 'CHI', 'SA'], ['Universidad de Chile', 'UCH', 68, 'CHI', 'SA'],
  ['LDU Quito', 'LDU', 71, 'ECU', 'SA'], ['Independiente del Valle', 'IDV', 72, 'ECU', 'SA'], ['Barcelona SC', 'BSC', 67, 'ECU', 'SA'],
  ['Olimpia', 'OLI', 68, 'PAR', 'SA'], ['Cerro Porteño', 'CER', 68, 'PAR', 'SA'], ['Libertad', 'LIB', 68, 'PAR', 'SA'],
  ['Universitario', 'UNI', 66, 'PER', 'SA'], ['Alianza Lima', 'ALI', 65, 'PER', 'SA'], ['Sporting Cristal', 'SCR', 64, 'PER', 'SA'],
  ['Bolívar', 'BOL', 64, 'BOL', 'SA'], ['The Strongest', 'TSG', 62, 'BOL', 'SA'], ['Caracas FC', 'CAR', 58, 'VEN', 'SA'],
  // Азия
  ['Vissel Kobe', 'VIS', 70, 'JPN', 'AS'], ['Kashima Antlers', 'KAS', 69, 'JPN', 'AS'], ['Kawasaki Frontale', 'KAW', 69, 'JPN', 'AS'],
  ['Urawa Reds', 'URA', 68, 'JPN', 'AS'], ['Sanfrecce Hiroshima', 'SAN', 68, 'JPN', 'AS'], ['Yokohama F. Marinos', 'YFM', 68, 'JPN', 'AS'],
  ['Ulsan HD', 'ULS', 68, 'KOR', 'AS'], ['Jeonbuk Motors', 'JEO', 68, 'KOR', 'AS'], ['Pohang Steelers', 'POH', 65, 'KOR', 'AS'], ['FC Seoul', 'SEO', 65, 'KOR', 'AS'],
  ['Shanghai Port', 'SHP', 66, 'CHN', 'AS'], ['Shanghai Shenhua', 'SHS', 66, 'CHN', 'AS'], ['Chengdu Rongcheng', 'CHE', 63, 'CHN', 'AS'],
  ['Al-Sadd', 'SAD', 69, 'QAT', 'AS'], ['Al-Duhail', 'DUH', 67, 'QAT', 'AS'], ['Al-Gharafa', 'GHA', 65, 'QAT', 'AS'],
  ['Al-Ain', 'AIN', 68, 'UAE', 'AS'], ['Shabab Al-Ahli', 'SAH', 68, 'UAE', 'AS'], ['Al-Wahda', 'WAH', 65, 'UAE', 'AS'],
  ['Persepolis', 'PRS', 65, 'IRN', 'AS'], ['Esteghlal', 'EST', 64, 'IRN', 'AS'], ['Buriram United', 'BUR', 62, 'THA', 'AS'],
  ['Pakhtakor', 'PAK', 62, 'UZB', 'AS'], ['Al-Shorta', 'SHO', 61, 'IRQ', 'AS'],
  // КОНКАКАФ
  ['Club América', 'AME', 74, 'MEX', 'NA'], ['Monterrey', 'MON', 73, 'MEX', 'NA'], ['Tigres UANL', 'TIG', 73, 'MEX', 'NA'], ['Cruz Azul', 'CAZ', 72, 'MEX', 'NA'],
  ['Toluca', 'TOL', 71, 'MEX', 'NA'], ['Guadalajara', 'GDL', 70, 'MEX', 'NA'], ['Pachuca', 'PAC', 69, 'MEX', 'NA'], ['Club León', 'LEO', 68, 'MEX', 'NA'],
  ['Saprissa', 'SAP', 62, 'CRC', 'NA'], ['Alajuelense', 'ALA', 62, 'CRC', 'NA'], ['Olimpia (HON)', 'OLH', 58, 'HON', 'NA'], ['Real España', 'RES', 56, 'HON', 'NA'],
  ['Municipal', 'MUN', 56, 'GUA', 'NA'], ['Plaza Amador', 'PLA', 54, 'PAN', 'NA'], ['Cavalier', 'CAV', 52, 'JAM', 'NA'], ['Forge FC', 'FRG', 56, 'CAN', 'NA'],
];

export const LEAGUE_BY_ID = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));
