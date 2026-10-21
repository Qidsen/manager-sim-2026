// Настоящие эмблемы клубов: id команды в базе ESPN. Картинки грузятся из интернета и кэшируются.
// Ключ — название клуба в игре; при совпадении названий — «Название|СТРАНА».
export const ESPN_IDS = {
  // Англия
  Arsenal: 359, Liverpool: 364, 'Manchester City': 382, Chelsea: 363, 'Manchester United': 360, Tottenham: 367, Newcastle: 361,
  'Aston Villa': 362, Brighton: 331, 'Nottingham Forest': 393, 'Crystal Palace': 384, Bournemouth: 349, Brentford: 337, Fulham: 370,
  'West Ham': 371, Everton: 368, Wolverhampton: 380, 'Leeds United': 357, Sunderland: 366, Burnley: 379,
  'Leicester City': 375, Southampton: 376, 'Ipswich Town': 373, 'Sheffield United': 398, Middlesbrough: 369, 'Coventry City': 388,
  'Norwich City': 381, 'West Bromwich': 383, Watford: 395, Millwall: 391, 'Hull City': 306, 'Bristol City': 333, 'Stoke City': 336,
  'Swansea City': 318, Preston: 394, 'Queens Park Rangers': 334, 'Blackburn Rovers': 365, 'Derby County': 374, Portsmouth: 385,
  'Birmingham City': 392, Wrexham: 352, Charlton: 372, 'Oxford United': 311, 'Sheffield Wednesday': 399,
  // Испания
  'Real Madrid': 86, Barcelona: 83, 'Atlético Madrid': 1068, 'Athletic Club': 93, Villarreal: 102, 'Real Betis': 244, 'Real Sociedad': 89,
  'Celta Vigo': 85, Sevilla: 243, Girona: 9812, Valencia: 94, Osasuna: 97, 'Rayo Vallecano': 101, Mallorca: 84, Getafe: 2922,
  Espanyol: 88, 'Alavés': 96, Levante: 1538, Elche: 3751, 'Real Oviedo': 92,
  // Италия
  Inter: 110, Napoli: 114, Milan: 103, Juventus: 111, Atalanta: 105, Roma: 104, Lazio: 112, Bologna: 107, Como: 2572, Fiorentina: 109,
  Torino: 239, Udinese: 118, Genoa: 3263, Sassuolo: 3997, Cagliari: 2925, Parma: 115, Lecce: 113, 'Hellas Verona': 119, Cremonese: 4050, Pisa: 3956,
  // Германия
  'Bayern München': 132, 'Bayer Leverkusen': 131, 'Borussia Dortmund': 124, 'RB Leipzig': 11420, 'Eintracht Frankfurt': 125,
  'VfB Stuttgart': 134, 'SC Freiburg': 126, "Borussia M'gladbach": 268, 'VfL Wolfsburg': 138, 'Mainz 05': 2950, 'TSG Hoffenheim': 7911,
  'Werder Bremen': 137, 'Union Berlin': 598, 'FC Augsburg': 3841, '1. FC Köln': 122, 'Hamburger SV': 127, 'FC St. Pauli': 270, '1. FC Heidenheim': 6418,
  // Франция
  'Paris Saint-Germain': 160, 'Olympique Marseille': 176, 'AS Monaco': 174, 'LOSC Lille': 166, 'Olympique Lyonnais': 167, 'OGC Nice': 2502,
  'RC Lens': 175, 'Stade Rennais': 169, 'RC Strasbourg': 180, 'Stade Brestois': 6997, Toulouse: 179, 'FC Nantes': 165, 'AJ Auxerre': 172,
  'Angers SCO': 7868, 'Le Havre': 3236, 'FC Lorient': 273, 'Paris FC': 6851, 'FC Metz': 177,
  // Нидерланды
  PSV: 148, Feyenoord: 142, Ajax: 139, 'AZ Alkmaar': 140, 'FC Twente': 152, 'FC Utrecht': 153, 'Go Ahead Eagles': 3706, 'NEC Nijmegen': 147,
  'sc Heerenveen': 146, 'FC Groningen': 145, 'Sparta Rotterdam': 151, 'Fortuna Sittard': 143, 'PEC Zwolle': 2565, 'Heracles Almelo': 3708,
  'NAC Breda': 141, Excelsior: 2566, Telstar: 3735, 'FC Volendam': 2727,
  // Португалия
  'Sporting CP': 2250, Benfica: 1929, 'FC Porto': 437, 'SC Braga': 2994, 'Vitória SC': 5309, 'Famalicão': 12698, 'Gil Vicente': 3699,
  Moreirense: 3696, 'Casa Pia': 21581, 'Estoril Praia': 12216, 'Rio Ave': 3822, 'Santa Clara': 12215, 'FC Arouca': 15784,
  'Estrela Amadora': 21610, 'Nacional|POR': 3472, 'FC Alverca': 21613,
  // Турция
  Galatasaray: 432, 'Fenerbahçe': 436, 'Beşiktaş': 1895, Trabzonspor: 997, 'Başakşehir': 7914, 'Göztepe': 789, Samsunspor: 11429,
  'Eyüpspor': 20729, 'Kasımpaşa': 6870, Konyaspor: 7648, Rizespor: 7656, Alanyaspor: 9078, 'Gaziantep FK': 20070, Kocaelispor: 995, 'Gençlerbirliği': 996,
  // Украина
  'Шахтар': 493, 'Динамо Київ': 440, 'ЛНЗ': 131795,
  // Бельгия
  'Club Brugge': 570, 'Union SG': 5807, Anderlecht: 441, 'KRC Genk': 938, 'KAA Gent': 3611, 'Royal Antwerp': 17544, 'Standard Liège': 559,
  'KV Mechelen': 7879, 'Cercle Brugge': 3610, 'Sint-Truiden': 936, Westerlo: 606, Charleroi: 3616, 'OH Leuven': 5579, 'Zulte Waregem': 4691,
  'RAAL La Louvière': 131235,
  // Шотландия
  Celtic: 256, Rangers: 257, Hearts: 262, Hibernian: 258, Aberdeen: 263, Motherwell: 266, 'Dundee United': 264, 'St Mirren': 250,
  Kilmarnock: 260, Dundee: 261, Falkirk: 254, Livingston: 259,
  // Бразилия
  Flamengo: 819, Palmeiras: 2029, Botafogo: 6086, Cruzeiro: 2022, 'São Paulo': 2026, Corinthians: 874, Fluminense: 3445, 'Atlético Mineiro': 7632,
  Internacional: 1936, 'Grêmio': 6273, Bahia: 9967, 'Vasco da Gama': 3454, Fortaleza: 6272, 'Red Bull Bragantino': 6079, Santos: 2674,
  Mirassol: 9169, 'Ceará': 9969, 'Vitória': 3457, Juventude: 6270, 'Sport Recife': 7635,
  // Аргентина
  'River Plate': 16, 'Boca Juniors': 5, 'Racing Club': 15, 'Vélez Sarsfield': 21, Estudiantes: 8, Talleres: 19, Independiente: 11,
  'San Lorenzo': 18, 'Lanús': 12, 'Rosario Central': 17, 'Huracán': 10, 'Argentinos Juniors': 3, "Newell's Old Boys": 14, Belgrano: 4,
  'Defensa y Justicia': 8950, Tigre: 7767, Platense: 7764, 'Unión': 20, 'Gimnasia La Plata': 9, Instituto: 2975, Banfield: 235,
  'Independiente Rivadavia': 9744, 'Atlético Tucumán': 9785, 'Barracas Central': 10060, 'Central Córdoba': 11989, Sarmiento: 10158,
  Aldosivi: 9739, 'Deportivo Riestra': 17702,
  // США
  'Inter Miami': 20232, LAFC: 18966, 'Columbus Crew': 183, 'LA Galaxy': 187, 'FC Cincinnati': 18267, 'Seattle Sounders': 9726,
  'Philadelphia Union': 10739, 'Vancouver Whitecaps': 9727, 'San Diego FC': 22529, 'Orlando City': 12011, 'Charlotte FC': 21300,
  'Nashville SC': 18986, 'New York City FC': 17606, 'Minnesota United': 17362, 'Portland Timbers': 9723, 'Atlanta United': 18418,
  'Austin FC': 20906, 'Real Salt Lake': 4771, 'Houston Dynamo': 6077, 'Chicago Fire': 182, 'FC Dallas': 185, 'Colorado Rapids': 184,
  'New England Revolution': 189, 'CF Montréal': 9720, 'D.C. United': 193,
  // Саудовская Аравия
  Antalyaspor: 3794, Kayserispor: 3643, 'Fatih Karagümrük': 20736, 'Godoy Cruz': 6756,
  'New York Red Bulls': 190, 'San Jose Earthquakes': 191, 'Sporting KC': 186, 'Toronto FC': 7318, 'St. Louis City': 21812,
  'Al-Hilal': 929, 'Al-Nassr': 817, 'Al-Ittihad': 2276, 'Al-Ahli': 8346, 'Al-Qadsiah': 22022, 'Al-Ettifaq': 8363, 'Al-Taawoun': 18459,
  'Al-Shabab': 793, 'Al-Fateh': 13033, 'Al-Khaleej': 21829, 'Al-Fayha': 21827, 'Al-Riyadh': 21965, 'Al-Kholood': 22028, 'Al-Hazem': 21964, 'NEOM SC': 130899,
  // Еврокубки и остальной мир
  'Red Bull Salzburg': 2790, 'Sturm Graz': 3746, 'Rapid Wien': 519, 'FC Basel': 989, 'Young Boys': 2722, Servette: 20032, Olympiacos: 435,
  PAOK: 605, Panathinaikos: 443, 'AEK Athens': 887, 'Slavia Praha': 494, 'Sparta Praha': 433, 'Viktoria Plzeň': 11706, 'FC København': 909,
  'FC Midtjylland': 572, 'Bodø/Glimt': 2980, Molde: 2715, 'Malmö FF': 2720, 'Dinamo Zagreb': 597, 'Hajduk Split': 489, 'Crvena zvezda': 2290,
  'Legia Warszawa': 555, 'Lech Poznań': 2990, 'Pafos FC': 22281, 'Ferencváros': 622, 'Maccabi Tel Aviv': 524, FCSB: 484, Ludogorets: 13018,
  'Qarabağ': 10414, Kairat: 2528, 'Slovan Bratislava': 521, Celje: 3362, 'Sheriff Tiraspol': 614, 'Shamrock Rovers': 2564, Rakow: 21005,
  LASK: 4411, 'Brøndby': 575, Rosenborg: 438, 'HJK Helsinki': 502, 'FC Lugano': 7672, 'Peñarol': 2683, 'Nacional|URU': 2684,
  'Atlético Nacional': 5264, Millonarios: 5484, Junior: 4815, 'Independiente Santa Fe': 5488, 'Colo-Colo': 2688, 'Universidad de Chile': 4139,
  'LDU Quito': 4816, 'Independiente del Valle': 17086, 'Barcelona SC': 2686, 'Cerro Porteño': 2671, Libertad: 2670, Universitario: 2685,
  'Sporting Cristal': 2673, 'Bolívar': 2681, 'Vissel Kobe': 7477, 'Kashima Antlers': 7115, 'Kawasaki Frontale': 7112, 'Urawa Reds': 3385,
  'Sanfrecce Hiroshima': 7114, 'Yokohama F. Marinos': 7116, 'Ulsan HD': 7120, 'FC Seoul': 6972, 'Shanghai Port': 15515, 'Shanghai Shenhua': 977,
  'Chengdu Rongcheng': 21355, 'Al-Sadd': 7135, 'Al-Duhail': 12008, 'Al-Gharafa': 7129, 'Shabab Al-Ahli': 790, 'Al-Wahda': 7134,
  'Buriram United': 7138, 'Al-Shorta': 9655, 'Club América': 227, Monterrey: 220, 'Tigres UANL': 232, 'Cruz Azul': 218, Toluca: 223,
  Guadalajara: 219, Pachuca: 234, 'Club León': 228, Alajuelense: 2057, 'Olimpia (HON)': 884, 'Real España': 7245, 'Forge FC': 20026,
};


// Эмблемы, которых нет в ESPN: прямые ссылки (TheSportsDB / FotMob)
const TSDB = (k) => `https://r2.thesportsdb.com/images/media/team/badge/${k}.png/small`;
const FOTMOB = (id) => `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;
export const LOGO_URLS = {
  'Полісся': TSDB('6r8o5l1725171180'), 'Кривбас': TSDB('2e11ks1681107496'), 'Карпати': TSDB('rsptsu1447696881'),
  'Зоря': TSDB('pvppfe1785305666'), 'Верес': TSDB('i0gdag1791992866'), 'Оболонь': TSDB('kp9xq81751734322'),
  'Колос': TSDB('42hl731573324390'), 'Кудрівка': TSDB('2cijmk1724176898'), 'Епіцентр': TSDB('abxdfe1724215373'),
  'Олександрія': TSDB('wrxkb41603126932'), 'Рух': TSDB('0erwxi1597533225'), 'Металіст 1925': FOTMOB(949030),
  'СК Полтава': FOTMOB(1395689),
  Partizan: TSDB('xe41k11781157208'), APOEL: TSDB('j5m0pu1779579095'),
  AVS: FOTMOB(1889), 'CD Tondela': FOTMOB(188163), 'FCV Dender': FOTMOB(7947), 'San Martín SJ': FOTMOB(89395),
  'Al-Okhdood': FOTMOB(582759), Damac: FOTMOB(582823), 'Al-Najma': FOTMOB(1523707), Olimpia: FOTMOB(6619),
  'Alianza Lima': FOTMOB(6398), 'The Strongest': FOTMOB(2527), 'Caracas FC': FOTMOB(7850), 'Jeonbuk Motors': FOTMOB(46038),
  'Pohang Steelers': FOTMOB(109373), 'Al-Ain': FOTMOB(102117), Persepolis: FOTMOB(101610), Esteghlal: FOTMOB(101614),
  Pakhtakor: FOTMOB(102141), Saprissa: FOTMOB(6607), Municipal: FOTMOB(9933), 'Plaza Amador': FOTMOB(165476), Cavalier: FOTMOB(5806),
};

// Лиги ESPN, где игра сама ищет недостающие эмблемы (по названию)
export const ESPN_LEAGUES = [
  'ukr.1', 'usa.1', 'tur.1', 'por.1', 'ksa.1', 'arg.1', 'bel.1', 'srb.1', 'cyp.1', 'per.1', 'par.1', 'bol.1', 'ven.1', 'kor.1',
  'uae.1', 'irn.1', 'uzb.1', 'crc.1', 'gua.1', 'pan.1', 'jam.1', 'isr.1', 'ecu.1', 'uru.1', 'jpn.1', 'chn.1', 'qat.1', 'tha.1',
];

// Как клубы называются латиницей (для поиска)
export const ALIASES = {
  'Шахтар': 'Shakhtar Donetsk', 'Динамо Київ': 'Dynamo Kyiv', 'Полісся': 'Polissya Zhytomyr', 'Олександрія': 'Oleksandriya',
  'Кривбас': 'Kryvbas', 'Карпати': 'Karpaty Lviv', 'ЛНЗ': 'LNZ Cherkasy', 'Зоря': 'Zorya Luhansk', 'Рух': 'Rukh Lviv', 'Верес': 'Veres Rivne',
  'Оболонь': 'Obolon Kyiv', 'Колос': 'Kolos Kovalivka', 'Металіст 1925': 'Metalist 1925', 'Кудрівка': 'Kudrivka', 'Епіцентр': 'Epitsentr',
  'СК Полтава': 'Poltava', 'New York Red Bulls': 'New York Red Bulls', 'St. Louis City': 'St. Louis City', 'Sporting KC': 'Sporting Kansas City',
  'San Jose Earthquakes': 'San Jose Earthquakes', 'Toronto FC': 'Toronto FC', 'Fatih Karagümrük': 'Karagumruk', Antalyaspor: 'Antalyaspor',
  Kayserispor: 'Kayserispor', 'CD Tondela': 'Tondela', AVS: 'AVS', 'Godoy Cruz': 'Godoy Cruz', 'San Martín SJ': 'San Martin',
  'Al-Okhdood': 'Okhdood', Damac: 'Damac', 'Al-Najma': 'Najma', 'FCV Dender': 'Dender', Partizan: 'Partizan', APOEL: 'APOEL',
  Olimpia: 'Olimpia', 'Alianza Lima': 'Alianza Lima', 'The Strongest': 'The Strongest', 'Caracas FC': 'Caracas', 'Jeonbuk Motors': 'Jeonbuk',
  'Pohang Steelers': 'Pohang', 'Al-Ain': 'Al Ain', Persepolis: 'Persepolis', Esteghlal: 'Esteghlal', Pakhtakor: 'Pakhtakor',
  Saprissa: 'Saprissa', Municipal: 'Municipal', 'Plaza Amador': 'Plaza Amador', Cavalier: 'Cavalier',
};

export const espnLogo = (id, size = 96) => `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${id}.png&w=${size}&h=${size}`;
