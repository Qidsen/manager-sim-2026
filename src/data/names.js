// Пулы имён для генерации игроков. Имена собираются случайно,
// совпадения с реальными людьми возможны, но не намеренны.
const sp = (s) => s.split(' ').map((x) => x.replace(/_/g, ' '));
const P = (first, last) => ({ first: sp(first), last: sp(last) });

export const NAME_POOLS = {
  en: P(
    'James Jack Harry Oliver George Charlie Thomas Jacob Alfie Leo Noah Mason Lewis Callum Ben Sam Joe Dan Kieran Ryan Connor Tyler Reece Jamie Louis Elliot Max Archie Freddie Kai',
    'Smith Jones Taylor Brown Wilson Evans Walker Wright Robinson Thompson White Hughes Edwards Green Hall Wood Harris Clarke Jackson Turner Hill Moore Cooper Ward Morris King Baker Harrison Morgan Lee Parker Bennett Gray Cole Price Fletcher Barnes Hunt Palmer Mills Shaw Webb Dixon Knight'
  ),
  es: P(
    'Alejandro Pablo Sergio Javier Daniel Adrián Álvaro Hugo Mario Diego Iker Marcos Raúl Rubén Carlos Iván Gonzalo Unai Jorge Aitor Íñigo Óscar Víctor Rodrigo Marc Pau Nico Dani Borja Aleix',
    'García Martínez López Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Muñoz Álvarez Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez Ramos Gil Ramírez Serrano Blanco Molina Morales Suárez Ortega Delgado Castro Ortiz Rubio Marín Sanz Iglesias Medina Garrido Cortés'
  ),
  la: P(
    'Santiago Matías Sebastián Nicolás Juan Lucas Franco Facundo Agustín Thiago Joaquín Valentín Emiliano Tomás Bruno Lautaro Gonzalo Maximiliano Ezequiel Rodrigo Cristian Brian Alexis Kevin Luis Andrés Felipe Jhon Yeferson Wilmar',
    'González Rodríguez Fernández López Martínez Pérez Gómez Díaz Sosa Romero Álvarez Torres Ruiz Ramírez Flores Benítez Acosta Medina Herrera Suárez Aguirre Giménez Gutiérrez Pereyra Molina Castro Ortiz Silva Rojas Vargas Paredes Cabrera Correa Ríos Valencia Quintero Mosquera Cuesta Arias Zapata'
  ),
  pt: P(
    'João Rodrigo Diogo Tiago Gonçalo Rafael Francisco Pedro Miguel Bernardo Duarte Tomás Nuno Rui André Bruno Ricardo Vitinha Fábio Hugo Martim Afonso Henrique Leonardo Simão Gustavo Salvador Lourenço Dinis Vasco',
    'Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Gonçalves Gomes Lopes Marques Alves Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes Nunes Soares Vieira Monteiro Cardoso Rocha Neves Coelho Cruz Cunha Pires Ramos Reis Simões Antunes Matos'
  ),
  br: P(
    'Gabriel Lucas Matheus Pedro Guilherme Gustavo Rafael Felipe Bruno Vinícius Thiago Caio Diego Leonardo Igor Vitor Douglas Wesley Everton Rodrygo Endrick Danilo Marquinhos Raphael Murilo Arthur Kaio Yuri Breno Luan',
    'Silva Santos Oliveira Souza Lima Pereira Ferreira Costa Rodrigues Almeida Nascimento Araújo Carvalho Gomes Martins Rocha Ribeiro Alves Monteiro Mendes Barros Freitas Barbosa Pinto Moura Cavalcanti Dias Castro Campos Cardoso Teixeira Vieira Andrade Moreira Nunes Fonseca Batista Lopes Correia Machado'
  ),
  it: P(
    'Lorenzo Alessandro Leonardo Francesco Matteo Andrea Gabriele Riccardo Tommaso Davide Federico Nicolò Marco Luca Giovanni Simone Filippo Pietro Daniele Stefano Mattia Samuele Giacomo Christian Manuel Alessio Emanuele Gianluca Edoardo Michele',
    'Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile Martinelli Vitale Lombardo Serra Coppola De_Santis Bellini Pellegrini'
  ),
  de: P(
    'Lukas Leon Finn Jonas Paul Luca Felix Maximilian Elias Ben Noah Tim Jan Niklas Julian Moritz Florian Kai Leroy Joshua Jamal Florian Nico Robin David Marvin Kevin Timo Lennart Malte',
    'Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Schmitt Werner Krause Meier Lehmann Schmid Schulze Maier Köhler Herrmann König Walter Mayer Huber Kaiser'
  ),
  fr: P(
    'Lucas Hugo Théo Nathan Louis Enzo Mathis Tom Arthur Raphaël Maxime Antoine Kylian Ousmane Adrien Clément Baptiste Romain Jules Bastien Corentin Benjamin Aurélien Warren Désiré Malo Rayan Mathys Wesley Loïc',
    'Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia David Bertrand Roux Vincent Fournier Morel Girard André Lefèvre Mercier Dupont Lambert Bonnet François Martinez Legrand Garnier Faure Rousseau Blanc Guerin Muller Henry Roussel Nicolas'
  ),
  nl: P(
    'Daan Sem Lucas Levi Finn Luuk Milan Jesse Bram Thijs Tim Stijn Ruben Jurriën Teun Noa Xavi Joey Ryan Brian Quinten Jordy Kees Sven Wout Jens Bart Lars Mats Gijs',
    'de_Jong Jansen de_Vries van_den_Berg van_Dijk Bakker Janssen Visser Smit Meijer de_Boer Mulder de_Groot Bos Vos Peters Hendriks van_Leeuwen Dekker Brouwer de_Wit Dijkstra Smits de_Graaf van_der_Meer Kok Jacobs de_Haan Vermeulen van_den_Heuvel Veenstra Koster Verhoeven Prins Huisman Peeters Maes Claes Wouters Mertens'
  ),
  tr: P(
    'Mehmet Mustafa Ahmet Ali Hüseyin Hasan İbrahim Emre Burak Arda Kerem Barış Ozan Cengiz Hakan Kaan Yusuf Ferdi Orkun Salih Abdülkerim Çağlar Okay Semih Uğurcan Mert Efe Eren Berkay Doğukan',
    'Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Korkmaz Özer Güler Akın Erdoğan Bulut Tekin Aktürk Güneş Ünal Keskin Coşkun Turan Ateş Akgün Kahveci Çalhanoğlu Tosun Kökçü'
  ),
  ua: P(
    'Олександр Андрій Дмитро Максим Владислав Артем Богдан Віталій Микола Іван Ярослав Денис Сергій Олег Роман Назар Тарас Євген Ілля Георгій Валерій Матвій Данило Костянтин Олексій Віктор Юрій Михайло Анатолій Руслан',
    'Шевченко Бондаренко Коваленко Ткаченко Кравченко Олійник Шевчук Поліщук Бойко Мельник Ковальчук Мороз Лисенко Марченко Руденко Савченко Петренко Клименко Павленко Кузьменко Гончаренко Дяченко Литвиненко Тимошенко Зінченко Сидоренко Мельниченко Ярмоленко Степаненко Мудрик Забарний Судаков Ванат Трубін Яремчук Довбик Маліновський Миколенко Свідерський'
  ),
  ar: P(
    'Mohammed Abdullah Fahad Salem Saud Faisal Nasser Sultan Khalid Ali Yasser Turki Hassan Omar Ahmed Abdulrahman Saleh Hamad Firas Nawaf Mansour Ziyad Musab Rakan Talal Majed Hattan Ayman Bandar Riyad',
    'Al-Dawsari Al-Shehri Al-Qahtani Al-Ghamdi Al-Harbi Al-Otaibi Al-Malki Al-Shammari Al-Zahrani Al-Mutairi Al-Anazi Al-Faraj Al-Najei Al-Amri Al-Juwayr Kanno Al-Buraikan Al-Bulayhi Tambakti Al-Owais Al-Aqidi Madu Al-Tambakti Al-Hassan Al-Sulaiheem Al-Khaibari Al-Ghannam Abdulhamid Ghareeb Asiri'
  ),
  maghreb: P(
    'Youssef Achraf Hakim Sofiane Riyad Ismaël Amine Bilal Nayef Ilias Azzedine Abde Brahim Rayan Said Mehdi Houssem Ramy Aïssa Yassine Anass Zakaria Ayoub Nabil Ismail Hamza Oussama Walid Karim Ilyes',
    'Bounou El Kaabi Ziyech Hakimi Amrabat Mazraoui Aguerd Ounahi Saïss Mahrez Bennacer Bensebaini Slimani Belaïli Atal Mandi Aouar Gouiri Zerrouki Chaibi Benrahma Feghouli Ait-Nouri Msakni Laïdouni Skhiri Talbi Meriah Khazri Hannibal Salah Marmoush Trezeguet Elneny Hegazi Ashour Zizo Fathi Attia Kamal'
  ),
  wa: P(
    'Moussa Ibrahima Mamadou Cheikh Ismaïla Sadio Idrissa Abdoulaye Pape Boubacar Seydou Amadou Ousmane Lamine Kalidou Habib Nicolas Franck Serge Wilfried Yves Sébastien Jean-Philippe Simon Odilon Evan Krépin Christian Mohamed Bamba',
    'Diallo Traoré Koné Coulibaly Diarra Camara Sissoko Touré Cissé Sow Ndiaye Diop Fall Sarr Mané Gueye Mendy Koulibaly Kouyaté Badji Dieng Ba Kanté Doumbia Keita Konaté Sangaré Fofana Bakayoko Zaha Kessié Haller Aurier Boly Seri Dembélé Sangaré Ouattara Kamara Bayo'
  ),
  ng: P(
    'Victor Samuel Wilfred Kelechi Alex Joe Ademola Moses Calvin Taiwo Ola Frank Semi Raphael Terem Bright Kenneth Paul Chidera Emmanuel Thomas Mohammed Antoine Jordan Andre Daniel Kamaldeen Iñaki Abdul Fatawu',
    'Osimhen Iwobi Ndidi Lookman Chukwueze Onyeka Aribo Simon Iheanacho Bassey Awoniyi Troost-Ekong Ajayi Ola_Aina Sadiq Moffi Boniface Onuachu Ejuke Okoye Partey Kudus Ayew Semenyo Salisu Djiku Lamptey Nuamah Sulemana Issahaku Bukari Owusu Asante Mensah Boateng Adjei Ofori Quaye Amartey'
  ),
  nordic: P(
    'Erik Lars Anders Magnus Kristian Martin Mathias Jonas Oliver William Emil Victor Rasmus Mikkel Andreas Sander Jens Joakim Isak Viktor Dejan Gustav Hugo Elias Alexander Kasper Christian Pierre-Emile Tobias Morten',
    'Hansen Johansen Olsen Larsen Andersen Pedersen Nilsen Kristiansen Jensen Karlsen Johansson Andersson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Pettersson Jonsson Lindberg Lindqvist Berg Haaland Ødegaard Sørloth Nusa Højlund Hjulmand Eriksen Christensen Kristensen Nielsen Lindelöf Gyökeres Forsberg Elanga Kulusevski'
  ),
  pl: P(
    'Jakub Kacper Szymon Mateusz Bartosz Michał Piotr Kamil Krzysztof Łukasz Paweł Tomasz Dawid Adrian Sebastian Przemysław Karol Jan Robert Wojciech Arkadiusz Nicola Bartłomiej Marcin Damian Filip Oskar Patryk Igor Maciej',
    'Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowski Zieliński Szymański Woźniak Dąbrowski Kozłowski Jankowski Mazur Kwiatkowski Krawczyk Piotrowski Grabowski Nowakowski Pawłowski Michalski Nowicki Adamczyk Dudek Zając Wieczorek Jabłoński Król Majewski Olszewski Szczęsny Bednarek Kiwior Moder Świderski Piątek Frankowski Cash Zalewski'
  ),
  cz: P(
    'Jan Jakub Tomáš Lukáš Matěj Ondřej David Adam Vojtěch Filip Martin Patrik Václav Michal Petr Stanislav Ladislav Milan Marek Dávid Ivan Róbert Juraj Ľubomír Norbert Peter Tomáš Lukas Pavel Antonín',
    'Novák Svoboda Novotný Dvořák Černý Procházka Kučera Veselý Horák Němec Pokorný Marek Pospíšil Hájek Jelínek Král Růžička Beneš Fiala Sedláček Doležal Zeman Kolář Navrátil Čermák Souček Schick Coufal Hložek Holeš Škriniar Hamšík Lobotka Duda Haraslín Kucka Boženík Dúbravka Gyömbér Hancko'
  ),
  yu: P(
    'Luka Marko Nikola Stefan Filip Aleksandar Milan Ivan Josip Mateo Dušan Sergej Andrej Mario Ante Lovro Dejan Nemanja Strahinja Vanja Edin Ermedin Benjamin Amar Miralem Kenan Haris Elvis Arijan Milot',
    'Modrić Kovačić Perišić Gvardiol Brozović Kramarić Vlašić Pašalić Livaković Šutalo Majer Sučić Baturina Mitrović Tadić Vlahović Milinković-Savić Lukić Gudelj Kostić Pavlović Živković Jović Vušković Džeko Pjanić Kolašinac Demirović Hajradinović Bajraktarević Krasniqi Muriqi Rashica Berisha Hoxha Selmani Bytyqi Ilić Babić'
  ),
  hu: P(
    'Dominik Péter Ádám Bence Márton Dániel Roland Willi Attila Zsolt Barnabás Kevin Loïc Milos Gergő Tamás Endre Csaba Balázs Krisztián Norbert Benedek Zalán Levente Martin Patrik Kristóf Botond Áron Olivér',
    'Szoboszlai Sallai Orbán Nagy Kerkez Szalai Gulácsi Kalmár Schäfer Varga Lang Fiola Kleinheisler Botka Styles Dibusz Bolla Ádám Németh Kovács Tóth Szabó Horváth Kiss Molnár Farkas Balogh Papp Takács Juhász Lakatos Mészáros Oláh Simon Rácz Fekete'
  ),
  ro: P(
    'Andrei Alexandru Ionuț Răzvan Nicolae Denis Dennis Florin Vlad Radu Valentin Ianis Darius Bogdan Mihai Cristian Marius Ștefan Adrian Daniel Horațiu Deian Rareș Tudor Octavian Cătălin Sergiu Gabriel Dragoș Raul',
    'Popescu Ionescu Popa Stan Dumitru Stoica Gheorghe Matei Ciobanu Constantin Rusu Munteanu Mihai Dragomir Hagi Răţiu Drăguşin Burcă Marin Man Mihăilă Puşcaş Stanciu Nedelcearu Niţă Moldovan Coman Olaru Sorescu Bancu Tănase Cicâldău Crețu Racovițan Ivan Dobre Chiricheș Mitriță Boțică'
  ),
  gr: P(
    'Giorgos Dimitris Konstantinos Nikos Vangelis Kostas Christos Anastasios Fotis Manolis Panagiotis Tasos Odysseas Charalambos Lazaros Pantelis Sotiris Petros Andreas Michalis Christos Thanasis Vasilis Ioannis Giannis Stelios Alexandros Antonis Theodoros Kyriakos',
    'Papadopoulos Georgiou Nikolaidis Konstantinidis Vlachodimos Tsimikas Mavropanos Hatzidiakos Kourbelis Bakasetas Pelkas Masouras Ioannidis Pavlidis Giakoumakis Siopis Douvikas Tzolis Mantalos Fortounis Retsos Vagiannidis Zeca Rota Baldock Limnios Mitroglou Fountas Papastathopoulos Karagounis Christodoulou Antoniou Dimitriou Alexiou Pappas Stamatis Charalambous Ioannou Kyriakou Koutsias'
  ),
  jp: P(
    'Takumi Kaoru Wataru Daichi Ritsu Takefusa Ko Ao Hiroki Yuki Junya Kyogo Ayase Daizen Shogo Takehiro Zion Keito Kota Yuto Reo Koki Ayumu Shuto Hidemasa Kaishu Yukinari Takuma Daiki Sota',
    'Minamino Mitoma Endo Doan Kubo Itakura Tanaka Ito Morita Ueda Kamada Nakamura Tomiyasu Maeda Furuhashi Asano Suzuki Machida Watanabe Sano Sugawara Hashioka Seko Takai Yamamoto Kobayashi Sato Takahashi Yoshida Inoue Kimura Hayashi Shimizu Yamaguchi Matsumoto Ikeda Hashimoto Ishikawa Ogawa Okada'
  ),
  kr: P(
    'Heung-min Kang-in Min-jae Hee-chan Jae-sung Gue-sung In-beom Seung-ho Woo-yeong Young-woo Jin-su Jun-ho Hyeon-gyu Ji-sung Jun-ho Seol Tae-hwan Yong-woo Dong-jun Jin-ho Sang-ho Min-kyu Hyun-woo Chang-hoon Seung-hyun Kyung-won Moon-hwan Jae-ik Ui-jo Chan-ho',
    'Son Lee Kim Hwang Cho Paik Jeong Seol Oh Yang Bae Park Jung Choi Kang Yoon Jang Lim Han Shin Seo Kwon Hwang Ahn Song Jeon Hong Yoo Ko Moon Nam Bae Baek Heo Noh Ha Ju Gu Yeo Woo'
  ),
  cn: P(
    'Wei Lei Hao Jie Yang Tao Peng Jun Bin Chao Long Xin Yu Zhe Kai Rui Bo Lin Ming Feng Qiang Yi Shuai Hang Xiang Dong Liang Fei Gang Yuan',
    'Wang Li Zhang Liu Chen Yang Zhao Huang Zhou Wu Xu Sun Hu Zhu Gao Lin He Guo Ma Luo Liang Song Zheng Xie Han Tang Feng Yu Dong Xiao Cheng Cao Yuan Deng Xu Fu Shen Zeng Peng Wei'
  ),
  ir: P(
    'Mehdi Sardar Alireza Ali Saman Ehsan Milad Majid Morteza Hossein Saeid Ramin Shojae Omid Karim Rouzbeh Mohammad Amir Reza Payam Saleh Allahyar Ahmad Vahid Mohsen Aria Hamid Arash Behnam Hadi',
    'Taremi Azmoun Jahanbakhsh Gholizadeh Hajsafi Mohammadi Pouraliganji Kanaanizadegan Ezatolahi Rezaeian Beiranvand Nourollahi Ghoddos Cheshmi Moharrami Hosseini Karimi Rahimi Ahmadi Rezaei Ghasemi Sadeghi Mousavi Jafari Hashemi Kazemi Ebrahimi Moradi Sayyadmanesh Shahab Asadi Abdollahi Ansari Sharifi Bagheri Rostami Zare Najafi Mahdavi Shojaei'
  ),
  us: P(
    'Christian Weston Tyler Gio Tim Brenden Folarin Ricardo Josh Antonee Chris Sergiño Matt Zack Johnny Malik Yunus Haji Aidan Caden Diego Cade Ethan Jordan Paxten Brandon Luca Owen Cole Alex',
    'Pulisic McKennie Adams Reyna Weah Aaronson Balogun Pepi Sargent Robinson Richards Dest Turner Steffen Cardoso Tillman Musah Wright Morris Clark Luna Cowell Horvath Zimmerman Long Scally Carter-Vickers Wiley Vazquez Ream Johnson Miller Davis Anderson Thomas Martin White Hernandez Moore'
  ),
  mx: P(
    'Hirving Raúl Santiago Edson César Jorge Luis Guillermo Héctor Orbelín Henry Uriel Alexis Johan Carlos Érick Julián Gilberto Roberto Jesús Kevin Israel Rodrigo Marcel Diego Andrés Luis Ángel Tecatito Germán Obed',
    'Lozano Jiménez Giménez Álvarez Montes Sánchez Chávez Ochoa Herrera Pineda Martín Antuna Vega Vásquez Rodríguez Gutiérrez Quiñones Mora Alvarado Reyes Romo Huerta Ruiz Berterame Lainez Corona Moreno Araujo Orozco Ramírez Flores Cervantes Mendoza Guzmán Salazar Domínguez Castillo Ríos Navarro Luna'
  ),
  au: P(
    'Mathew Harry Jackson Aiden Kye Riley Connor Mitchell Nestory Jordan Cameron Martin Ajdin Craig Keanu Brandon Garang Mohamed Jacob Thomas Nishan Alessandro Marco Lewis Sam Kusini Patrick Joel Liam Jason',
    'Ryan Souttar Irvine Rowles Behich Atkinson Goodwin McGree Duke Devlin Boyle Bos Hrustic Leckie Kuol Baccus Metcalfe Deng Burgess Silvera Miller Circati Mabil Yengi Irankunda Popovic Taggart Italiano Wright Robinson Smith Taylor Brown Wilson Clarke Hughes Fraser Burns Murray Kelly'
  ),
};

// Страна -> пул имён
export const NATION_POOL = {
  ENG: 'en', SCO: 'en', WAL: 'en', NIR: 'en', IRL: 'en', USA: 'us', CAN: 'us', JAM: 'en', AUS: 'au', NZL: 'au',
  ESP: 'es', ARG: 'la', URU: 'la', COL: 'la', CHI: 'la', ECU: 'la', PAR: 'la', PER: 'la', BOL: 'la', VEN: 'la',
  MEX: 'mx', CRC: 'la', PAN: 'la', HON: 'la', SLV: 'la', GUA: 'la', CUB: 'la', DOM: 'la', NCA: 'la',
  POR: 'pt', BRA: 'br', CPV: 'pt', ANG: 'pt', MOZ: 'pt', GNB: 'pt',
  ITA: 'it', SMR: 'it', GER: 'de', AUT: 'de', SUI: 'de', LIE: 'de', LUX: 'fr',
  FRA: 'fr', BEL: 'nl', NED: 'nl', TUR: 'tr', AZE: 'tr', UKR: 'ua', MDA: 'ro', ROU: 'ro',
  KSA: 'ar', QAT: 'ar', UAE: 'ar', KUW: 'ar', BHR: 'ar', OMA: 'ar', IRQ: 'ar', JOR: 'ar', SYR: 'ar', LBN: 'ar', PLE: 'ar', YEM: 'ar',
  MAR: 'maghreb', ALG: 'maghreb', TUN: 'maghreb', EGY: 'maghreb', LBY: 'maghreb',
  SEN: 'wa', CIV: 'wa', MLI: 'wa', GUI: 'wa', BFA: 'wa', CMR: 'wa', GAB: 'wa', COD: 'wa', CGO: 'wa', BEN: 'wa', TOG: 'wa', MTN: 'wa', NIG: 'wa', MAD: 'wa', COM: 'wa',
  NGA: 'ng', GHA: 'ng', RSA: 'ng', ZAM: 'ng', ZIM: 'ng', KEN: 'ng', UGA: 'ng', TAN: 'ng', SLE: 'ng', GAM: 'ng', LBR: 'ng', ETH: 'ng', SUD: 'ng', NAM: 'ng', BOT: 'ng', MWI: 'ng', EQG: 'wa',
  NOR: 'nordic', SWE: 'nordic', DEN: 'nordic', FIN: 'nordic', ISL: 'nordic', FRO: 'nordic', EST: 'nordic', LVA: 'pl', LTU: 'pl',
  POL: 'pl', CZE: 'cz', SVK: 'cz', SVN: 'yu', CRO: 'yu', SRB: 'yu', BIH: 'yu', MNE: 'yu', MKD: 'yu', ALB: 'yu', KOS: 'yu', BUL: 'yu', BLR: 'ua', GEO: 'ua', ARM: 'ua', KAZ: 'ua',
  HUN: 'hu', GRE: 'gr', CYP: 'gr', ISR: 'en', MLT: 'it', AND: 'es', GIB: 'en',
  JPN: 'jp', KOR: 'kr', PRK: 'kr', CHN: 'cn', HKG: 'cn', IRN: 'ir', UZB: 'ua', THA: 'cn', VIE: 'cn', IDN: 'cn', MAS: 'cn', IND: 'en', TJK: 'ir', KGZ: 'ua', PHI: 'en',
  HAI: 'fr', TRI: 'en', CUW: 'nl', SUR: 'nl', NCL: 'fr', TAH: 'fr', FIJ: 'en', SOL: 'en', PNG: 'en',
};
