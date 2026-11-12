// IPTV — posts module.
// Parses iptv-org M3U playlists into channel posts.
// Sandbox calls: getPosts({filter, page, providerValue}),
//                getSearchPosts({searchQuery, page, providerValue})
// v1.1.0: all non-Islamic religious + all non-Islamic Indian channels removed (Islamic channels kept, even Indian ones).

var BASE = 'https://iptv-org.github.io/iptv/';
var PAGE_SIZE = 20;

var PLAYLISTS = {
  all: 'index.m3u',
  pk: 'countries/pk.m3u',
  in: 'countries/in.m3u',
  uk: 'countries/uk.m3u',
  us: 'countries/us.m3u',
  'cat:news': 'categories/news.m3u',
  'cat:sports': 'categories/sports.m3u',
  'cat:movies': 'categories/movies.m3u',
  'cat:music': 'categories/music.m3u',
  'cat:kids': 'categories/kids.m3u',
  'cat:entertainment': 'categories/entertainment.m3u',
  'cat:documentary': 'categories/documentary.m3u'
};

// Playlist cache (per sandbox lifetime).
var playlistCache = {};

function parseExtInf(line) {
  var info = { name: '', logo: '', group: '' };
  var attrRe = /([A-Za-z0-9_-]+)="([^"]*)"/g;
  var m, lastEnd = 0;
  while ((m = attrRe.exec(line)) !== null) {
    lastEnd = m.index + m[0].length;
    var k = m[1].toLowerCase();
    if (k === 'tvg-logo') info.logo = m[2];
    else if (k === 'group-title') info.group = m[2];
  }
  var rest = line.slice(lastEnd);
  var ci = rest.indexOf(',');
  info.name = (ci >= 0 ? rest.slice(ci + 1) : rest).trim();
  return info;
}

// Channels REMOVED from this provider (2026-11-12, user order):
// ALL non-Islamic religious channels (every faith) AND ALL non-Islamic
// Indian channels. Islamic religious channels are KEPT, even Indian ones
// (user refinement 2026-11-12 ~23:54 PKT). Pakistan channels stay.
// The provider fetches iptv-org playlists live, so the filter runs at
// parse time - it applies to every playlist and to search, and meta.js
// applies the same filter so a removed channel cannot be reached
// through a saved or shared link either.
//
// Rule: remove iff (religious OR indian) AND NOT islamic, where
//   religious = group-title contains "Religious" (multi-group values
//     like "Culture;Religious" count) OR base name in RELIGIOUS_NAMES
//     (channels that are religious programming but not group-tagged:
//     the 64 Hindu names + BCN Gospel TV HD)
//   indian    = base name in INDIAN_NAMES (iptv-org in.m3u, 826 names,
//     + 30 foreign feeds whose tvg-id country is .in, + 2 UK Star feeds)
//   islamic   = keep-key (base name with every trailing "(...)" group
//     stripped) in ISLAMIC_KEEP (94 names, hand-verified by web search;
//     false positives excluded: the 7 Nour* Maronite Christian names,
//     Fateh TV (Sikh), the 4 MISA TV Catholic-Mass names, Payame
//     Aramesh TV + Sayare TV (both Christian, verified 2026-11-13);
//     MGI TV (Media Gema Islam, Indonesia) + MahdawiounTV (Iraq,
//     Mahdist/Shia) added 2026-11-13, both verified Islamic.
//     baseName() strips every trailing [...] status marker
//     ([Geo-blocked], [Not 24/7], [Not 24/7;Geo-blocked]) -
//     without this, 'Name (720p) [Geo-blocked]' never matched
//     the sets: 22 channels leaked and Al Resalah was wrongly
//     removed (fixed 2026-11-13))
var RELIGIOUS_NAMES = {"Aastha": 1, "Aastha Bhajan": 1, "Aastha Gujarati": 1, "Aastha HD": 1, "Aastha International": 1, "Aastha Kannada": 1, "Aastha Prime 1": 1, "Aastha Tamil": 1, "Aastha Telugu": 1, "Aastha UK": 1, "Adhyatm TV": 1, "Anand TV (India)": 1, "Anand TV (United Kingdom)": 1, "Anand Wari TV": 1, "Awakening TV": 1, "BCN Gospel TV HD": 1, "Bhagyam TV": 1, "Bhakthi Siri": 1, "Bhakthi TV": 1, "Bhakti Dhara": 1, "Bhakti Sagar": 1, "CVR OM Spiritual": 1, "Channel Divya": 1, "Chintpurni Live": 1, "Darshan 24": 1, "Dheeran TV": 1, "Divya Bhajan": 1, "Divya Darshan TV": 1, "Divya Darshan TV HD": 1, "Hare Krsna TV": 1, "Hindu Dharmam": 1, "Ishwar Bhakti TV": 1, "Knock Bhakti": 1, "MH One Shraddha": 1, "Mahaa Bhakti": 1, "Mahotsav TV": 1, "Mangalmay TV": 1, "OM TV": 1, "PMC Telugu": 1, "Peace of Mind TV": 1, "Ragni": 1, "SVBC": 1, "SVBC 2": 1, "SVBC 3": 1, "SVBC 4": 1, "Sadhna": 1, "Sadhna TV": 1, "Sadvidya TV": 1, "Sai TV": 1, "Sairam TV": 1, "Sankara TV": 1, "Sanskar TV": 1, "Sanskar UK": 1, "Sanskar USA": 1, "Sanskar Web TV": 1, "Satsang TV": 1, "Satsang Web TV": 1, "Shraddha TV": 1, "Shree Sanatan TV": 1, "Shri Shyam TV": 1, "Soham TV": 1, "Swastik TV": 1, "Total Bhakti": 1, "Vedic": 1, "ZB Bhakti": 1};
var INDIAN_NAMES = {"&TV International": 1, "10 TV": 1, "22Scope News": 1, "24 News": 1, "4 SiDES TV": 1, "4TV News": 1, "6 TV Telugu": 1, "7S Music": 1, "7X Music": 1, "9 Plus News": 1, "99TV": 1, "9X Jalwa": 1, "9X Jhakaas": 1, "9X Tashan": 1, "9XM": 1, "ABN Andhra Jyoti": 1, "ABN TV India": 1, "ABP Ananda": 1, "ABP Asmita": 1, "ABP Ganga": 1, "ABP Majha": 1, "ABP News": 1, "ABP Sanjha": 1, "AKD Calcutta News": 1, "AMN TV": 1, "ANB News": 1, "APN": 1, "ATN Samachar": 1, "Aadinath TV": 1, "Aagaaz Times": 1, "Aaj Ki Khabar": 1, "Aaj Tak": 1, "Aaj Tak HD": 1, "Aakaash Aath": 1, "Aamar Bangla": 1, "Aaryaa TV": 1, "Aaseervatham TV": 1, "Aastha": 1, "Aastha Bhajan": 1, "Aastha Gujarati": 1, "Aastha HD": 1, "Aastha International": 1, "Aastha Kannada": 1, "Aastha Prime 1": 1, "Aastha Tamil": 1, "Aastha Telugu": 1, "Aastha UK": 1, "Adhyatm TV": 1, "Akhon Kolkata": 1, "Alankar TV": 1, "All Time Movies": 1, "Alright! TV": 1, "AmarUjala": 1, "Amrit Gurbani": 1, "Amrita TV": 1, "Anand TV (India)": 1, "Anand Wari TV": 1, "Ananda Barta": 1, "Anandpur Live": 1, "Andy Haryana": 1, "Angel TV": 1, "Angel TV Africa": 1, "Angel TV America": 1, "Angel TV Arabia": 1, "Angel TV Australia": 1, "Angel TV Chinese": 1, "Angel TV Europe": 1, "Angel TV FarEast": 1, "Angel TV Hebrew": 1, "Angel TV Indo-China": 1, "Angel TV Indonesia": 1, "Angel TV Nepal": 1, "Angel TV Portuguese": 1, "Angel TV Russian": 1, "Angel TV Spanish": 1, "Animax Asia India": 1, "Anjan TV": 1, "Anmol TV": 1, "Apna Punjab TV": 1, "Aradana TV": 1, "Argus News": 1, "Arputhar Yesu TV": 1, "Aryan TV National": 1, "Ashwaveega News 24x7": 1, "Asian News": 1, "Asianet HD": 1, "Asianet Middle East": 1, "Asianet Movies": 1, "Asianet News": 1, "Asianet Suvarna News": 1, "Asom Live 24": 1, "Assam Talks": 1, "Astroscience": 1, "Awaaz India TV": 1, "Awakening TV": 1, "Ayush TV": 1, "B4U Bhojpuri": 1, "B4U Bhojpuri Plus": 1, "B4U Kadak": 1, "B4U Movies": 1, "B4U Music": 1, "BHI Channel": 1, "BIG TV": 1, "BRK News": 1, "BSTV (India)": 1, "BT TV": 1, "BTL TV (Netherlands)": 1, "BVG": 1, "Bada Khabar": 1, "Balle Balle": 1, "Balle Balle HD": 1, "Bangla Jago": 1, "Bansal News": 1, "Bhagyam TV": 1, "Bhakthi Siri": 1, "Bhakthi TV": 1, "Bhakti Dhara": 1, "Bhakti Sagar": 1, "Bharat AtoZ": 1, "Bharat Express": 1, "Bharat Samachar": 1, "Bharat24": 1, "Bhojpuri Cinema": 1, "Big TV 24x7": 1, "Bollygold": 1, "Boogle Bollywood": 1, "CCV": 1, "CNBC Awaaz": 1, "CNBC Bajar": 1, "CNBC TV18": 1, "CNBC TV18 Prime HD": 1, "CNN News 18": 1, "CTVN AKD Plus": 1, "CVR English": 1, "CVR Health": 1, "CVR News": 1, "CVR OM Spiritual": 1, "Calvary TV": 1, "Captain": 1, "Cartoon Network HD+": 1, "Channel Divya": 1, "Channel WIN": 1, "Chardikla Gurbaani TV": 1, "Chardikla Time TV": 1, "Chardikla Time TV North America": 1, "Chhaya Chitram Telugu": 1, "Chintpurni Live": 1, "Chithiram": 1, "Cine Jomjomat": 1, "Cnews Bharat": 1, "Colors": 1, "Colors Bangla Cinema": 1, "Colors Bangla HD": 1, "Colors Cineplex": 1, "Colors Cineplex Bollywood": 1, "Colors Cineplex Superhits": 1, "Colors Gujarati": 1, "Colors HD": 1, "Colors Kannada HD": 1, "Colors MENA HD": 1, "Colors Marathi HD": 1, "Colors Rishtey": 1, "Colors Rishtey Americas": 1, "Colors Super": 1, "Colors Tamil HD": 1, "D5 Channel Punjabi": 1, "DD Arun Prabha": 1, "DD Assam": 1, "DD Bangla": 1, "DD Bharati": 1, "DD Bihar": 1, "DD Chandana": 1, "DD Chhattisgarh": 1, "DD Girnar": 1, "DD Goa": 1, "DD Haryana": 1, "DD Himachal Pradesh": 1, "DD India": 1, "DD Jharkhand": 1, "DD Kashir": 1, "DD Kisan": 1, "DD Madhya Pradesh": 1, "DD Malayalam": 1, "DD Manipur": 1, "DD Meghalaya": 1, "DD Mizoram": 1, "DD Nagaland": 1, "DD National": 1, "DD National HD": 1, "DD News": 1, "DD News HD": 1, "DD Odia": 1, "DD Punjabi": 1, "DD Rajasthan": 1, "DD Sahyadri": 1, "DD Saptagiri": 1, "DD Sports": 1, "DD Sports HD": 1, "DD Tamil": 1, "DD Tamil HD": 1, "DD Tripura": 1, "DD Urdu": 1, "DD Uttar Pradesh": 1, "DD Uttarakhand": 1, "DD Yadagiri": 1, "DNN": 1, "DY 365": 1, "Daily Post TV": 1, "Dangal 2": 1, "Dangal TV": 1, "Darshan 24": 1, "Darshana TV": 1, "Deewana HD": 1, "Desi Channel": 1, "Dhamaal": 1, "Dharm Sandesh": 1, "Dharsan TV": 1, "Dheeran TV": 1, "Dhool TV": 1, "Dhoom Music": 1, "Discovery Channel (India) HD": 1, "Disha TV": 1, "Divya Bhajan": 1, "Divyavani TV": 1, "DocuBay TV": 1, "Doraemon": 1, "Dukhnivaran Patiala Live": 1, "Dukhniwaran": 1, "E 24": 1, "ET Now": 1, "ET Now Swadesh": 1, "ETV Andhra Pradesh": 1, "ETV Beats": 1, "ETV Cinema": 1, "ETV Cinema HD": 1, "ETV Comedy": 1, "ETV Josh": 1, "ETV Life": 1, "ETV Music": 1, "ETV News": 1, "ETV Plus": 1, "ETV Plus HD": 1, "ETV Telangana": 1, "ETV Telugu HD": 1, "Ekamra Bharat Odia": 1, "Enterr 10 Bangla": 1, "Epic Bharat": 1, "Epic Bharat Digital": 1, "Epic Bhojpuri": 1, "Epic Bhojpuri Digital": 1, "Epic Crimes": 1, "Epic Kids Digital": 1, "Epic Music": 1, "Epic Music Digital": 1, "Epic TV Digital": 1, "Eurosport (India) HD": 1, "FGN Channel": 1, "Fakt Marathi": 1, "FashionTV (India)": 1, "Fast1": 1, "Fateh TV": 1, "First India News": 1, "Food Food": 1, "Friends TV": 1, "GS TV": 1, "GTC News": 1, "GTC Punjabi": 1, "GTC Punjabi UK": 1, "GTC Punjabi US": 1, "Gangaur TV": 1, "Gaunda Punjab TV": 1, "Gem TV": 1, "Global India": 1, "Global Punjab": 1, "Globe TV": 1, "Goldmines": 1, "Goldmines 2": 1, "Goldmines Action": 1, "Goldmines Bollywood": 1, "Goldmines Movies": 1, "Good News Today": 1, "GoodNews TV": 1, "Goodness TV": 1, "Gospel TV India": 1, "Grace TV": 1, "Green Gold TV": 1, "Guarantee News": 1, "Gujarat First": 1, "Gulistan News": 1, "Gyandarshan": 1, "Gyandarshan HD": 1, "HMTV (India)": 1, "HNN 24x7": 1, "HSTV": 1, "Hamdard TV": 1, "Har Khabar": 1, "Hare Krsna TV": 1, "Harvest TV": 1, "Harvest TV Keralam": 1, "Harvest USA": 1, "Headlines Tripura": 1, "Hebron TV": 1, "Hi Dost!": 1, "High News": 1, "Hindi Hits": 1, "Hindi Khabar": 1, "Hindu Dharmam": 1, "History TV18 HD": 1, "Hope Channel India": 1, "Hornbill TV": 1, "Hosanna TV": 1, "Hosanna TV Global": 1, "Hosanna TV Hindi": 1, "Hyder TV": 1, "IBC 24": 1, "INFAST": 1, "INH 24x7": 1, "INWILD": 1, "INews": 1, "InWonder": 1, "Ind 24": 1, "India Ahead": 1, "India Daily Live": 1, "India News": 1, "India News Gujarati": 1, "India News Haryana": 1, "India News Madhya Pradesh/Chhattisgarh": 1, "India News Punjab/Himachal": 1, "India News Rajasthan": 1, "India News Uttar Pradesh": 1, "India TV": 1, "India TV Speed News": 1, "India Talkies": 1, "India Today": 1, "India Voice": 1, "Indywood TV": 1, "Insync": 1, "Isai Aruvi": 1, "Ishwar Bhakti TV": 1, "JTBS Classic": 1, "Jai Maharashtra": 1, "Jaihind TV": 1, "Jalsha Movies": 1, "Jalsha Movies HD": 1, "Jan TV": 1, "Janam TV": 1, "Janta TV": 1, "Jantantra TV": 1, "Jaya Plus": 1, "Jeevan TV": 1, "Jinvani Channel": 1, "Jonack": 1, "Joy TV": 1, "K News India": 1, "KBC News": 1, "KBP Times": 1, "KCL TV": 1, "KCM India": 1, "KTV Bangla": 1, "Kabaddi 24x7": 1, "Kadak": 1, "Kairali Arabia": 1, "Kairali News": 1, "Kairali TV": 1, "Kairali We": 1, "Kalaignar Murasu": 1, "Kalaignar Seithigal": 1, "Kalaignar TV": 1, "Kalika TV": 1, "Kalinga TV": 1, "Kanak News": 1, "Kappa TV": 1, "Kashish News": 1, "Kaumudy TV": 1, "Kerala Vision": 1, "Khabar Fast": 1, "Khabrain Abhi Tak": 1, "Khushboo Bangla": 1, "Kite Victers": 1, "Knock Bhakti": 1, "Kolkata TV": 1, "Laxmi TV Gujarati": 1, "Life TV (India)": 1, "Live Times": 1, "Living India News": 1, "Lokshahi News": 1, "M Nadu TV": 1, "MBC TV": 1, "MH One": 1, "MH One Dil Se": 1, "MH One Movies": 1, "MH One Shraddha": 1, "MK Six": 1, "MTV (India)": 1, "MTV (India) HD": 1, "Madha TV": 1, "Madhimugam TV": 1, "Maha Movie": 1, "Maha Punjabi": 1, "Mahaa Bhakti": 1, "Mahaa Max": 1, "Mahaa News": 1, "Mahimai TV": 1, "Mahotsav TV": 1, "Mahua Khabar": 1, "Mahua Play": 1, "Makkal TV": 1, "Malai Murasu TV": 1, "Mangalmay TV": 1, "Mango (India)": 1, "Mango Mobile TV": 1, "Manorama News": 1, "Manoranjan Grand": 1, "Manoranjan Movies": 1, "Manoranjan Prime": 1, "Manoranjan TV": 1, "Mantavya News": 1, "Marutam TV": 1, "Mastiii": 1, "Mathrubhumi News": 1, "Mazhavil Manorama": 1, "Mazhavil Manorama HD": 1, "MediBizTV": 1, "Media One": 1, "Media9": 1, "Mei Alai TV": 1, "Mercy TV (India)": 1, "Metro TV (India)": 1, "Mh 1 Music": 1, "Mh 1 News": 1, "Mh 1 Prime": 1, "Mirror Now": 1, "Mojo TV": 1, "Moon TV": 1, "Movie Punjab": 1, "Movies Now HD": 1, "Mr Bean Animated": 1, "Munsif TV": 1, "Music India": 1, "NDTV": 1, "NDTV 24x7": 1, "NDTV Good Times": 1, "NDTV India": 1, "NDTV Madhya Pradesh Chhattisgarh": 1, "NDTV Marathi": 1, "NDTV Profit": 1, "NDTV Rajasthan": 1, "NE News": 1, "NH BollyFlix": 1, "NH BollyRaga": 1, "NH Tamil Gold": 1, "NK TV 24x7": 1, "NK TV Bangla": 1, "NKR TV Kannada": 1, "NSC9 News": 1, "NTC TV": 1, "NTV Telugu": 1, "Nagaland TV": 1, "Nambikkai TV": 1, "Namdhari TV": 1, "Namma Bangalore": 1, "Nanaksar Live": 1, "Nandighosha TV": 1, "Nation News": 1, "Naxatra News": 1, "Naxatra News Hindi": 1, "Nepal 1": 1, "Network 10": 1, "News 1 India": 1, "News 11": 1, "News 1st": 1, "News 24 (India)": 1, "News 24 MP & Chhattisgarh": 1, "News 7 Tamil": 1, "News Capital Gujarat": 1, "News Capital Market": 1, "News Daily 24": 1, "News Hour": 1, "News India 24x7": 1, "News J": 1, "News Leader": 1, "News Live": 1, "News Live Bangla": 1, "News Malayalam 24x7": 1, "News Marathi 24x7": 1, "News Nation": 1, "News Nation 81": 1, "News Only": 1, "News State MP & CHG": 1, "News State Maharashtra Goa": 1, "News State Punjab Haryana Himachal": 1, "News State UP & UK": 1, "News TV India": 1, "News Tamil 24x7": 1, "News18 Assam North-East": 1, "News18 Bangla": 1, "News18 Bihar Jharkhand": 1, "News18 Delhi NCR JK": 1, "News18 Gujarati": 1, "News18 India": 1, "News18 Kannada": 1, "News18 Kerala": 1, "News18 Madhya Pradesh/Chhattisgarh": 1, "News18 Marathi": 1, "News18 Odia": 1, "News18 Punjab/Haryana/Himachal": 1, "News18 Rajasthan": 1, "News18 Tamil Nadu": 1, "News18 Urdu": 1, "News18 Uttar Pradesh Uttarakhand": 1, "News9Live": 1, "NewsX": 1, "NewsX World": 1, "Nick Jr. (India)": 1, "Nickelodeon (India)": 1, "Nireekshana TV": 1, "Northeast Live": 1, "OM TV": 1, "Odisha TV": 1, "Oli TV (India)": 1, "One Paschima": 1, "Onkar News": 1, "Only Bharat": 1, "Orange Bangla TV": 1, "Oscar Movies Bhojpuri": 1, "PMC Telugu": 1, "PTC Chakde": 1, "PTC Music": 1, "PTC News": 1, "PTC Punjabi": 1, "PTC Punjabi Gold": 1, "PTC Punjabi HD": 1, "PTC Simran": 1, "Padharo SA": 1, "Pankh": 1, "Paras Gold": 1, "Pasand TV": 1, "Peace TV Bangla": 1, "Peace TV Urdu": 1, "Peace of Mind TV": 1, "Pear TV": 1, "Peppers TV": 1, "Pitaara": 1, "Pitaara Comedy": 1, "Pocket Films": 1, "Pogo": 1, "Polimer News": 1, "Polimer TV": 1, "Power TV (India)": 1, "Powervision TV": 1, "Pradesh24 Gujarati": 1, "Prag News": 1, "Prameya News7": 1, "Prarthana Bhawan TV": 1, "Prarthana Life": 1, "Pratham Khabar 24x7": 1, "Pratham News": 1, "Pratidin Time": 1, "Pravasi Channel": 1, "Prime News": 1, "Prime9 News": 1, "Prudent Media": 1, "Public First": 1, "Public Movies": 1, "Public Music": 1, "Public TV": 1, "Pudhari News": 1, "Pulari TV": 1, "Punjab Plus": 1, "Punjabi Beats HD": 1, "Punjabi Hits": 1, "Punjabi Music HD": 1, "Punjabi Shorts": 1, "Punjabi TV": 1, "Puthiya Thalaimurai": 1, "Puthiya Thalaimurai Express": 1, "Puthuyugam TV": 1, "Q TV": 1, "Qello Concerts by Stingray": 1, "R Plus": 1, "R Plus Gold": 1, "RDX Goa": 1, "RT India": 1, "Raatdin Bangla": 1, "Raftaar Media": 1, "Ragni": 1, "Raj Digital Plus": 1, "Raj Musix Kannada": 1, "Raj Musix Malayalam": 1, "Raj Musix Tamil": 1, "Raj Musix Telugu": 1, "Raj News Kannada": 1, "Raj News Malayalam": 1, "Raj News Telugu": 1, "Raj Pariwar": 1, "Raj TV": 1, "Ramdhenu": 1, "Rang": 1, "Real News Kerala": 1, "Rengoni": 1, "Reporter TV": 1, "Republic Bangla": 1, "Republic Bharat": 1, "Republic Kannada": 1, "Republic TV": 1, "Rongeen TV": 1, "Rozana Spokesman": 1, "Rupasi Bangla": 1, "SADA TV": 1, "SITI 24x7": 1, "SRK TV": 1, "STV Haryana News": 1, "SVBC": 1, "SVBC 2": 1, "SVBC 3": 1, "SVBC 4": 1, "Saam TV": 1, "Saang": 1, "Sach Bedhadak": 1, "Sadhna": 1, "Sadhna News Madhya Pradesh/Chhattisgarh": 1, "Sadhna Plus News": 1, "Sadhna TV": 1, "Sadvidya TV": 1, "Safari TV": 1, "Sahana News": 1, "Sai TV": 1, "Sairam TV": 1, "Sakshi TV": 1, "Salaam TV": 1, "Salvation TV (India)": 1, "Samachar Plus 24x7": 1, "Samay Kolkata": 1, "Sana Plus": 1, "Sana TV": 1, "Sandesh News": 1, "Sangeet Bangla": 1, "Sangeet Bhojpuri": 1, "Sangeet Marathi": 1, "Sankara TV": 1, "Sansad TV 1": 1, "Sansad TV 1 HD": 1, "Sansad TV 2": 1, "Sansad TV 2 HD": 1, "Sanskar TV": 1, "Sanskar UK": 1, "Sanskar USA": 1, "Sanskar Web TV": 1, "Santvani Channel": 1, "Sarv Dharm Sangam": 1, "Sathiyam TV": 1, "Satsang TV": 1, "Satsang Web TV": 1, "Shaheedan Live": 1, "Shaheedan Shahib": 1, "Shalom": 1, "Shalom Global": 1, "Sharnam TV": 1, "Shekinah TV": 1, "Shemaroo Filmi Gaane": 1, "Shemaroo Josh": 1, "Shemaroo Marathi Bana": 1, "Shemaroo TV": 1, "Shemaroo Umang": 1, "Shiksha TV": 1, "Shin-chan": 1, "Shree Hazur Sahibji": 1, "Shree Sanatan TV": 1, "Shri Shyam TV": 1, "Shubh Cinema TV": 1, "Shubh TV": 1, "Shubhsandesh TV": 1, "Sindh TV (India)": 1, "Siri Kannada": 1, "Siri Kannada All Time": 1, "Sirippoli TV": 1, "Soham TV": 1, "Sonar Bangla": 1, "Soneri Cinema": 1, "Songdew TV": 1, "Sonic": 1, "Sony Aath": 1, "Sony Entertainment Television HD": 1, "Sony Max 1": 1, "Sony Pal": 1, "Sony Wah": 1, "Sony Yay!": 1, "Sooriyan TV": 1, "South Station": 1, "Spondon": 1, "Star Bharat (India) HD": 1, "Star Bharat (United Kingdom)": 1, "Star Jalsha": 1, "Star Jalsha HD": 1, "Star Maa HD": 1, "Star Maa Movies HD": 1, "Star Pravah HD": 1, "Star Sports 2 Telugu HD": 1, "Star Sports Select 2 HD": 1, "Star Utsav": 1, "Star Utsav Movies": 1, "Star Vijay UK": 1, "StarPlus (India) HD": 1, "StarPlus (United Kingdom)": 1, "Starnet": 1, "Steelbird Music": 1, "Stingray Classic Rock": 1, "Stingray DJAZZ": 1, "Stingray Easy Listening": 1, "Stingray Naturescape": 1, "Stingray The Spa": 1, "Stingray Today's K-Pop": 1, "Studio One +": 1, "Studio Yuva": 1, "Subhavaartha TV": 1, "Subin TV": 1, "Sudarshan News": 1, "Sun Gemini": 1, "Sun Surya HD": 1, "Sun TV HD": 1, "Suriya TV": 1, "Suriyan TV": 1, "Surya Samachar": 1, "Suvarna News SD": 1, "Swadesh News": 1, "Swaraj Express SMBC": 1, "Swastik Stories": 1, "Swastik TV": 1, "Swatantra TV": 1, "T News": 1, "TNP News": 1, "TOI Global": 1, "TTN24": 1, "TV 100 (India)": 1, "TV BRICS English": 1, "TV Punjab": 1, "TV13 Gujarati": 1, "TV27 News": 1, "TV30 India": 1, "TV45": 1, "TV5 Kannada": 1, "TV5 News": 1, "TV7 Bharat": 1, "TV7 National": 1, "TV9 Bangla": 1, "TV9 Bharatvarsh": 1, "TV9 Gujarati": 1, "TV9 Kannada": 1, "TV9 Marathi": 1, "TV9 Telugu": 1, "Taaza TV": 1, "Tabbar Hits": 1, "Tamil Janam": 1, "TamilVision-TV": 1, "Tamilan TV": 1, "Tarang Music": 1, "Tarang TV": 1, "Tehzeeb TV": 1, "Telugu One": 1, "Thalaa TV": 1, "Thanthi One": 1, "Thanthi TV": 1, "The Jungle Book": 1, "The Movie Club": 1, "The Movie Club +2": 1, "The Pet Collective India": 1, "The Q India": 1, "The Unmute": 1, "The Voice TV": 1, "Thendral TV": 1, "Times Now": 1, "Times Now Navbharat": 1, "Times Now Navbharat HD": 1, "Tolly TV": 1, "Top News Marathi": 1, "Total Bhakti": 1, "Total TV Haryana": 1, "Travelxp 4K Czechia": 1, "Travelxp 4K HDR": 1, "Travelxp Czechia": 1, "Travelxp HD": 1, "Travelxp Russia": 1, "Tunes 6": 1, "U Bangla": 1, "UP NOW": 1, "UTV Palakkad": 1, "Ultimate TV": 1, "Unique TV": 1, "V6 News": 1, "VCV": 1, "VIP News": 1, "VR Live": 1, "VTU": 1, "VTV News": 1, "Vaanavil TV": 1, "Valam TV": 1, "Valam TV Dayro": 1, "Vanitha TV": 1, "Vasanth TV": 1, "Vedic": 1, "Velicham TV": 1, "Vendhar TV": 1, "Vijay Takkar APAC": 1, "Village TV": 1, "Vision (India)": 1, "Vision Beats": 1, "Vissa TV": 1, "Vistaar News": 1, "Vyas Channel": 1, "WION": 1, "WOW Kidz": 1, "WOW Kidz Tamil": 1, "WOW Kidz Telugu": 1, "Wah Punjabi": 1, "WeatherSpy (India)": 1, "Win TV": 1, "World Punjabi TV": 1, "YRF Music": 1, "YRF Music Nepal": 1, "ZB Bhakti": 1, "ZB Cartoon": 1, "ZB Cinema": 1, "ZB Music": 1, "Zainabia Channel": 1, "Zee 24 Ghanta": 1, "Zee 24 Kalak": 1, "Zee 24 Taas": 1, "Zee Action": 1, "Zee Bangla HD": 1, "Zee Bangla Sonar": 1, "Zee Bharat": 1, "Zee Bihar Jharkhand": 1, "Zee Business": 1, "Zee Cine Classic": 1, "Zee Cinema APAC": 1, "Zee Comedy Nation": 1, "Zee Delhi NCR Haryana": 1, "Zee Dil Se": 1, "Zee Horror Nights": 1, "Zee Kannada HD": 1, "Zee Kannada News": 1, "Zee Madhya Pradesh Chhattisgarh": 1, "Zee Marathi HD": 1, "Zee News": 1, "Zee Punjab Haryana Himachal": 1, "Zee Rajasthan": 1, "Zee South Flix": 1, "Zee TV HD": 1, "Zee Tamil": 1, "Zee Tamil HD": 1, "Zee Tamil News": 1, "Zee Telugu HD": 1, "Zee Telugu News": 1, "Zee Uttar Pradesh/Uttarakhand": 1, "ZillarBarta News": 1, "Zingabad": 1, "Zodiak TV": 1, "Zoom (India)": 1};
var ISLAMIC_KEEP = {"Ahlulbayt TV": 1, "Ahsan TV": 1, "Al Maaref TV": 1, "Al Quran Al Kareem TV": 1, "Al Resalah": 1, "Al Sunnah Al Nabawiyah TV": 1, "Al Wilayah": 1, "Al-Aimma TV": 1, "Al-Bahjah TV": 1, "Al-Iman TV": 1, "Al-Jawadain TV": 1, "Al-Mahdi TV": 1, "Al-Rafidain TV": 1, "Al-Zahra TV Turkic": 1, "Alabbassia TV": 1, "Alerth Alnabawi Channel": 1, "Alistiqama TV": 1, "Almagd TV Middle East": 1, "Almagd TV North America": 1, "Alquran": 1, "Amozhgary TV": 1, "Ashiil TV": 1, "Assirat TV": 1, "Azan TV": 1, "Bahrain Quran": 1, "Dacwa TV": 1, "Diyanet TV": 1, "Dost TV": 1, "Eman Channel": 1, "Erfan Halgheh TV": 1, "Eslah TV": 1, "Fajar TV": 1, "Habib TV": 1, "Holy Quran Radio": 1, "Holy Quran Radio Nablus": 1, "Huda TV": 1, "Huzur TV": 1, "ISA TV": 1, "Imam Hussein TV 1": 1, "Imam Hussein TV 2": 1, "Imam Hussein TV 3": 1, "Imam Hussein TV 4": 1, "Imam Hussein TV 5": 1, "Imam Hussein TV 6": 1, "Iman TV": 1, "Iqra Bangla": 1, "Iqra TV": 1, "Iqraa Africa & Europe": 1, "Iqraa Arabic": 1, "Iqraa Quran": 1, "Islam Channel": 1, "KTV Ethraa": 1, "Karbala Documentary": 1, "Lalegul TV": 1, "MGI TV": 1, "MTA1 World": 1, "MTA2 Europe": 1, "MTA3 Al-Arabia": 1, "MTA4 Africa": 1, "MTA5 Africa": 1, "MTA6 Asia": 1, "MTA7 Asia": 1, "MTA8 America": 1, "Madani Channel Bangla": 1, "Madani Channel English": 1, "Madani Channel Urdu": 1, "Madani TV": 1, "MahdawiounTV": 1, "Makkah TV": 1, "Marjaeyat TV Arabic": 1, "Marjaeyat TV English": 1, "Marjaeyat TV Persian": 1, "Muslim Network TV": 1, "Naajiya TV": 1, "Nabawi TV": 1, "Nesiha TV": 1, "Nidae AlIslam Radio": 1, "Noor TV": 1, "Paighan TV": 1, "Payvand TV": 1, "Peace TV Bangla": 1, "Peace TV Chinese": 1, "Peace TV English": 1, "Peace TV Urdu": 1, "Qatar TV The Holy Quran": 1, "Quran TV": 1, "RasoulallahTv": 1, "Safeer TV": 1, "Sharjah Radio Quran": 1, "TV Muslim Thailand": 1, "Thaqalayn TV": 1, "The Islamic Network": 1, "Velayat TV Network": 1, "Zainabia Channel": 1};

function baseName(name) {
  var n = String(name || '');
  var prev;
  do {
    prev = n;
    n = n.replace(/\s*\[[^\]]*\]\s*$/, '');
    n = n.replace(/\s*\(\d{3,4}[pi]\)\s*$/, '');
  } while (n !== prev);
  return n.trim();
}

function keepKey(name) {
  var n = baseName(name);
  var prev;
  do { prev = n; n = n.replace(/\s*\([^)]*\)\s*$/, '').trim(); } while (n !== prev);
  return n;
}

function isReligious(name, group) {
  var g = String(group || '');
  if (/(^|;)\s*Religious\s*(;|$)/i.test(g)) return true;
  return RELIGIOUS_NAMES.hasOwnProperty(baseName(name));
}

function isIndian(name) {
  return INDIAN_NAMES.hasOwnProperty(baseName(name));
}

function isIslamic(name) {
  return ISLAMIC_KEEP.hasOwnProperty(keepKey(name));
}

function shouldRemove(name, group) {
  return (isReligious(name, group) || isIndian(name)) && !isIslamic(name);
}

function parseM3U(text) {
  var channels = [];
  var lines = String(text || '').split('\n');
  var pending = null;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    if (line.indexOf('#EXTINF') === 0) {
      pending = parseExtInf(line);
    } else if (pending && line.charAt(0) !== '#') {
      if (/^https?:\/\//i.test(line) && !shouldRemove(pending.name, pending.group)) {
        channels.push({
          index: channels.length,
          name: pending.name || 'Untitled Channel',
          logo: pending.logo || '',
          group: pending.group || '',
          url: line
        });
      }
      pending = null;
    }
  }
  return channels;
}

async function loadPlaylist(filter) {
  var key = PLAYLISTS.hasOwnProperty(filter) ? filter : 'all';
  if (playlistCache[key]) return playlistCache[key];
  var res = await fetch(BASE + PLAYLISTS[key]);
  if (!res.ok) throw new Error('Playlist fetch failed: HTTP ' + res.status);
  var channels = parseM3U(await res.text());
  playlistCache[key] = channels;
  return channels;
}

function toPost(filter, ch) {
  return {
    title: ch.name,
    image: ch.logo,
    link: 'iptv|' + filter + '|' + ch.index,
    tag: 'Live'
  };
}

async function getPosts(args) {
  var filter = (args && args.filter) || 'all';
  var page = Math.max(1, parseInt((args && args.page) || '1', 10) || 1);
  var channels = await loadPlaylist(filter);
  var start = (page - 1) * PAGE_SIZE;
  return channels.slice(start, start + PAGE_SIZE).map(function (ch) {
    return toPost(filter, ch);
  });
}

async function getSearchPosts(args) {
  var q = String((args && args.searchQuery) || '').trim().toLowerCase();
  if (!q) return [];
  var channels = await loadPlaylist('all');
  var hits = [];
  for (var i = 0; i < channels.length && hits.length < 40; i++) {
    if (channels[i].name.toLowerCase().indexOf(q) !== -1) hits.push(toPost('all', channels[i]));
  }
  return hits;
}

// CommonJS exports for the unictoos sandbox (exact export names matter).
if (typeof module !== 'undefined' && module.exports) {
  module.exports.getPosts = getPosts;
  module.exports.getSearchPosts = getSearchPosts;
}
