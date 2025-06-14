function getQuery() {
  var text = window.parent.window.location.search;
  if (text.length == 0) return "";
  var query = decodeURIComponent(text);
  var re = /\?word=(.*?)(&|$)/;
  query = re.exec(query)[1];
  query = query.trim().toLowerCase();
  query = query.normalize('NFD');
  query = query.replace(/[\u0300-\u036f]/g, "");
  query = query.replace("æ", "ae");
  query = query.replace("œ", "oe");
  return query;
}

function notFound() {
  var header = document.getElementsByTagName("headword")[0];
  header.style.display = "";
  setFrameHeight();
}

function setFrameHeight() {
  // reset to small
  window.frameElement.style.height = "20px";
  // resize to actual
  window.frameElement.style.height =
    //document.getElementById("dictionary").scrollHeight + "px"; 
    document.body.scrollHeight + "px"; 
}

function requestDictionary(word) {
  var xhr = new XMLHttpRequest();
  var url = "https://latin-words.com/cgi-bin/translate.cgi?query=" + word;
  xhr.open("GET", url, true);
  xhr.onreadystatechange = parseResponse;
  xhr.send();
}

function parseResponse() {
  if (this.readyState != 4 || this.status != 200) {
    return;
  }
  
  var res = JSON.parse(this.responseText);
  if (res.status != "ok") return;

  var text = res.message;
  if (text.includes("========   UNKNOWN")) {
    notFound();
    return;
  }
  
  xmlDoc = document.createElement("div");
  text.split("\n").forEach(function(line) {
    var type = typeOfLine(line);
    var el = document.createElement("span");
    el.innerHTML = line;
    el.setAttribute("type", type);
    xmlDoc.appendChild(el);  
  });

  // rebuild into a tree
  var root = document.getElementsByTagName("ul")[0];
  for (i = xmlDoc.childElementCount; i > 0; i--) {
    el = xmlDoc.children[i-1];
    type = el.getAttribute("type", "unknown");
    if (type === "english") {
      var english = el.innerText;
    } else if (type === "lemma") {
      var lemma = document.createElement("li");
      lemma.innerHTML = parseLemma(el.innerHTML);
      var innerList = document.createElement("ul");
      innerList.classList.add("inner");
      var trans = document.createElement("li");
      trans.setAttribute("type", "english");
      trans.innerText = english;
      innerList.appendChild(trans);
      lemma.appendChild(innerList);
      root.insertBefore(lemma, root.firstChild);
    } else if (type === "form") {
      var item = document.createElement("li");
      item.innerHTML = parseForm(el.innerHTML);
      innerList.appendChild(item);
    } else {
      var item = document.createElement("li");
      item.setAttribute("type", "command");
      item.innerText = el.innerText;
      root.insertBefore(item, root.firstChild);
    }
  }

  setFrameHeight();
}

function typeOfLine(line) {
  line = line.trim();
  const reForm = /^[a-z.]+\s+(TACKON|PACK|PACKON|PREFIX|SUFFIX|INTERJ|SUPINE|CONJ|PACK|PREP|PRON|VPAR|ADJ|ADV|NUM|N|V)/;
  const reLemma = /\[[A-Z]{5}\]/;
  const reLemma2 = /.+?(TACKON|PACK|PREFIX|SUFFIX)/;
  var type = "";
  if ((m = reLemma.exec(line)) !== null) {
    type = "lemma"
  } else if ((m = reLemma2.exec(line)) !== null) {
    type = "lemma"
  } else if ((m = reForm.exec(line)) !== null) {
    type = "form";
  } else if (["Two words"].includes(line)) {
    type = "command"
  } else if (line.startsWith("Word mod")) {
    type = "command"
  } else if (line.startsWith("May be ")) {
    type = "command"
  } else {
    type = "english"
  }
  return type;  
}

function parseLemma(line) {
  line = line.trim();
  
  var re = /^([A-Za-z .,\/()-]+?)\s+(TACKON|PACK|PACKON|PREFIX|SUFFIX|INTERJ|SUPINE|CONJ|PACK|PREP|PRON|VPAR|ADJ|ADV|NUM|N|V)\b/;
  m = line.match(re);
  if (m == null) { return line; }

  html = document.createElement("div");

  el = document.createElement("span");
  el.classList.add("lemma");
  el.innerText = m[1];
  html.appendChild(el);
  
  html.appendChild(document.createTextNode(" "));
  var el = abbrPOS(m[2])
  html.appendChild(el);

  var tail = " " + line.substring(m[0].length).trim();
  tail = tail.replace(/ (\[.{5}\])/, parseCode);
  tail = tail.replace(/ (GEN|DAT|ABL|TRANS|INTRANS|IMPERS|DEP|SEMIDEP|PERFDEF)/, abbrLemma);
  tail = tail.replace(/\s(M|F|N|C|X)\b/, abbrGender);

  var el = document.createElement("span");
  el.classList.add("grammar");
  el.innerHTML = " " + tail;
  html.appendChild(el);

  return html.innerHTML;
}

function parseForm(line) {
  var re = /^([a-z]+)(?:\.([a-z]+))*\s+(TACKON|PACK|PACKON|PREFIX|SUFFIX|INTERJ|SUPINE|CONJ|PREP|PRON|VPAR|ADJ|ADV|NUM|N|V)/
  m = line.match(re);
  if (m == null) { return line; }
  
  html = document.createElement("div");

  var el = document.createElement("span");
  el.classList.add("form");
  el.innerText = m[1];
  if (typeof m[2] !== 'undefined') {
    var suffix = document.createElement("span");
    suffix.classList.add("suffix");
    suffix.innerText = m[2];
    el.appendChild(suffix);
  }
  html.appendChild(el);
  
  html.appendChild(document.createTextNode(": "));
  html.appendChild(abbrPOS(m[3]));

  var pos = m[3];
  var tail = line.substring(m[0].length).trim();
  tail = tail.replace(/ X\b/, "");
  tail = tail.replace(/(\d \d)\b/, abbrDecl);
  tail = tail.replace(/\s(NOM|VOC|GEN|LOC|DAT|ABL|ACC)\b/, abbrCase);
  tail = tail.replace(/\s(S|P|X)\b/, abbrNumber);
  tail = tail.replace(/\s(M|F|N|C|X)\b/, abbrGender);
  tail = tail.replace(/\s(POS|COMP|SUPER)\b/, abbrComparison);
  tail = tail.replace(/\s(CARD|ORD|DIST|ADVERB)\b/, abbrNumeral);
  tail = tail.replace(/\s(CARD|ORD|DIST|ADVERB)\b/, abbrTense);
  tail = tail.replace(/\s(PRES|IMPF|FUT|PERF|PLUP|FUTP)\b/, abbrTense);
  tail = tail.replace(/\s(IND|SUB|IMP|INF|PPL)\b/, abbrMood);
  tail = tail.replace(/\s(ACTIVE|PASSIVE)\b/, abbrVoice);
  tail = tail.replace(/\s([1-3])\b/, abbrPerson);

  var el = document.createElement("span");
  el.classList.add("grammar");
  el.innerHTML = " " + tail;
  html.appendChild(el);
  
  return html.innerHTML;
}

function abbrPOS(text) {
  var abbr = {
    "TACKON": ["particle", ""],
    "PACK":   ["particle", ""],
    "PACKON": ["particle", ""],
    "PREFIX": ["prefix", ""],
    "SUFFIX": ["suffix", ""],
    "INTERJ": ["interj.", "interjection"],
    "SUPINE": ["supine", "supine"],
    "CONJ":   ["conj.", "conjunction"],
    "PREP":   ["prep.", "preposition"],
    "PRON":   ["pron.", "pronoun"],
    "VPAR":   ["vpar.", "verb participle"],
    "ADJ":    ["adj.", "adjective"],
    "ADV":    ["adv.", "adverb"],
    "NUM":    ["num.", "numeral"],
    "N":      ["noun", ""],
    "V":      ["verb", ""],
  }
  var el = document.createElement("span");
  el.classList.add("pos");
  el.innerText = abbr[text][0];
  if (abbr[text][1] !== "") {
    el.setAttribute("title", abbr[text][1])
  }
  return el;
}

function abbrGender(text, p1) {
  var abbr = {
    "M": ["masc.", "masculine gender"],
    "F": ["fem.", "feminine gender"],
    "N": ["neut.", "neuter gender"],
    "C": ["comm.", "common gender"],
    "X": ["unk.", "all, none, or unknown gender"],
  }
  return parseAbbr(p1, abbr);
}

function abbrDecl(text) {
  var abbr = {
    "0": "0",
    "1": "I",
    "2": "II",
    "3": "III",
    "4": "IV",
    "5": "V",
    "6": "VI",
  }
  text = text.trim();
  var el = document.createElement("span");
  el.setAttribute("title", "declension or conjugation pattern");
  el.innerText = abbr[text[0]] + "(" + text[2] + ")";
  return " " + el.outerHTML + " ";
}

function abbrCase(text, p1) {
  var abbr = {
    "NOM": ["Nom.", "nominative"],
    "VOC": ["Voc.", "vocative"],
    "GEN": ["Gen.", "genitive"],
    "LOC": ["Loc.", "locative"],
    "DAT": ["Dat.", "dative"],
    "ABL": ["Abl.", "ablative"],
    "ACC": ["Acc.", "accusitive"],  
  }
  return parseAbbr(p1, abbr);
}

function abbrNumber(text, p1) {
  var abbr = {
    "X": ["unk.", "all, none, or unknown gender"],
    "S": ["sg.", "singular"],
    "P": ["pl.", "Plural"],
  }
  return parseAbbr(p1, abbr);
}

function abbrNumeral(text, p1) {
  var abbr = {
     "CARD"  : ["card.",   "cardinal"],
     "ORD"   : ["ord.",    "ordinal"],
     "DIST"  : ["dist.",   "distributive"],
     "ADVERB": ["adverb.", "numeral adverb"],
  }
  return parseAbbr(p1, abbr);
}

function abbrComparison(text, p1) {
  var abbr = {
    "POS"  : ["pos.",   "positive"   ],
    "COMP" : ["comp.",  "comparative"],
    "SUPER": ["super.", "superlative"],
  }
  return parseAbbr(p1, abbr);
}

function abbrTense(text, p1) {
  var abbr = {
    "PRES": ["pres.", "Present"],
    "IMPF": ["impf.", "Imperfect"],
    "FUT" : ["fut.",  "Future"],
    "PERF": ["perf.", "Perfect"],
    "PLUP": ["plup.", "Pluperfect"],
    "FUTP": ["futp.", "Future Perfect"],
  }
  return parseAbbr(p1, abbr);
}

function abbrMood(text, p1) {
  var abbr = {
    "IND": ["ind.",  "Indicative"],
    "SUB": ["subj.", "Subjunctive"],
    "IMP": ["imp.",  "Imperative"],
    "INF": ["inf.",  "Infinitive"],
    "PPL": ["ppl.",  "Participle"],
  }
  return parseAbbr(p1, abbr);
}

function abbrVoice(text, p1) {
  var abbr = {
    "ACTIVE": ["active", ""],
    "PASSIVE": ["passive", ""],
  }
  return parseAbbr(p1, abbr);
}

function abbrPerson(text, p1) {
  var abbr = {
    "1": ["1st", "first person"],
    "2": ["2nd", "second person"],
    "3": ["3rd", "third person"],
  }
  return parseAbbr(p1, abbr);
}

function abbrLemma(text, p1) {
  var abbr = {
    "GEN"    : ["+GEN"    , "verb taking the genitive"],
    "DAT"    : ["+DAT"    , "verb taking the dative"],  
    "ABL"    : ["+ABL"    , "verb taking the ablative"],
    "TRANS"  : ["trans."  , "transitive"],
    "INTRANS": ["intrans.", "intransitive"],
    "IMPERS" : ["impers." , "impersonal"],
    "DEP"    : ["dep."    , "deponent"],
    "SEMIDEP": ["semidep.", "semideponent"], 
    "PERFDEF": ["perf."   , "having only perfect stem"],
  }
  return parseAbbr(p1, abbr);
}

function parseAbbr(text, table) {
  var el = document.createElement("span");
  el.innerText = table[text][0];
  var full = table[text][1]
  if (full !== "") {
    el.setAttribute("title", full)
  }
  return " " + el.outerHTML;
}

function parseCode(full, text) {
  // example: [XXXCO] -- [AGE, AREA, GEO, FREQ, SOURCE]
  var tooltip = document.createElement("div");
  tooltip.classList.add("tooltiptext");
  
  var age_type = {
    "X": "in use throughout the ages or unknown",
    "A": "very early forms, obsolete by classical times",
    "B": "early Latin, pre-classical",
    "C": "limited to classical (~150 BC - 200 AD)",
    "D": "late, post-classical (III-V cent.)",
    "E": "not in use in Classical times (VI-X cen.) Christian",
    "F": "medieval (XI-XV cent.)",
    "G": "Scholarly/Scientific (XVI-XVIII cen.)",
    "H": "coined recently, words for new things (XIX-XX cen.)",
  }
  var el = document.createElement("p");
  el.innerText = text[1] + ": " + age_type[text[1]];
  tooltip.appendChild(el);
  
  var area_type = {
    "X": "(genre) all or none",
    "A": "Agriculture, Flora, Fauna, Land, Equipment, Rural",
    "B": "Biological, Medical, Body Parts",  
    "D": "Drama, Music, Theater, Art, Painting, Sculpture",
    "E": "Ecclesiastic, Biblical, Religious",
    "G": "Grammar, Retoric, Logic, Literature, Schools",                     
    "L": "Legal, Government, Tax, Financial, Political, Titles",
    "P": "Poetic",
    "S": "Science, Philosophy, Mathematics, Units/Measures",
    "T": "Technical, Architecture, Topography, Surveying",
    "W": "War, Military, Naval, Ships, Armor",
    "Y": "Mythology",
  }
  var el = document.createElement("p");
  el.innerText = text[2] + ": " + area_type[text[2]];
  tooltip.appendChild(el);
  
  var geo_type = {
    "X": "(geography) all or none",
    "A": "Africa",      
    "B": "Britian",     
    "C": "China",       
    "D": "Scandinavia", 
    "E": "Egypt",       
    "F": "France, Gaul",
    "G": "Germany",     
    "H": "Greece",      
    "I": "Italy, Rome",
    "J": "India",       
    "K": "Balkans",     
    "N": "Netherlands",
    "P": "Persia",      
    "Q": "Near East",   
    "R": "Russia",              
    "S": "Spain, Iberia",       
    "U": "Eastern Europe",  
  }
  var el = document.createElement("p");
  el.innerText = text[3] + ": " + geo_type[text[3]];
  tooltip.appendChild(el);
  
  var freq_type = {
    "X": "unknown or unspecified frequency",
    "A": "very frequent, top 1000+ words",
    "B": "frequent, next 2000+ words",
    "C": "in top 10,000 words",
    "D": "in top 20,000 words",
    "E": "2 or 3 citations",
    "F": "only single citation in OLD or L+S",
    "I": "only citation is inscription",
    "M": "presently not much used",
    "N": "appear only in Pliny Natural History",
  }
  var el = document.createElement("p");
  el.innerText = text[4] + ": " + freq_type[text[4]];
  tooltip.appendChild(el);
  
  var src_type = {
    "X": "general or unknown or too common to say",
    "A": "",
    "B": "C.H.Beeson, A Primer of Medieval Latin, 1925 (Bee)",
    "C": "Charles Beard, Cassell's Latin Dictionary 1892 (CAS)",       
    "D": "J.N.Adams, Latin Sexual Vocabulary, 1982 (Sex)",
    "E": "L.F.Stelten, Dictionary of Eccles. Latin, 1995 (Ecc)",
    "F": "Roy J. Deferrari, Dictionary of St. Thomas Aquinas, 1960 (DeF)",
    "G": "Gildersleeve + Lodge, Latin Grammar 1895 (G+L)",
    "H": "Collatinus Dictionary by Yves Ouvrard",
    "I": "Leverett, F.P., Lexicon of the Latin Language, Boston 1845",
    "J": "(empty)",
    "K": "Calepinus Novus, modern Latin, by Guy Licoppe (Cal)",
    "L": "Lewis, C.S., Elementary Latin Dictionary 1891",
    "M": "Latham, Revised Medieval Word List, 1980",
    "N": "Lynn Nelson, Wordlist",
    "O": "Oxford Latin Dictionary, 1982 (OLD)",
    "P": "Souter, A Glossary of Later Latin to 600 A.D., Oxford 1949",
    "Q": "other, cited or unspecified dictionaries",
    "R": "Plater & White, A Grammar of the Vulgate, Oxford 1926",
    "S": "Lewis and Short, A Latin Dictionary, 1879 (L+S)",
    "T": "(source) found in a translation",
    "U": "Du Cange",            
    "V": "Vademecum in opus Saxonis - Franz Blatt (Saxo)",
    "W": "(source) my personal guess",   
    "Y": "Temp special code",
    "Z": "(source) sent by user",
  }
  var el = document.createElement("p");
  el.innerText = text[5] + ": " + src_type[text[5]];
  tooltip.appendChild(el);

  var el = document.createElement("span");
  el.classList.add("code");
  el.innerText = text;
  el.appendChild(tooltip);
  el.setAttribute("onmouseover", "setFrameHeight(); setTooltipPos(this)")
  el.setAttribute("onmouseout", "resetTooltipStyles(this); setFrameHeight()")
  
  return " " + el.outerHTML;
}

function setTooltipPos(parent) {
  var el = parent.getElementsByClassName("tooltiptext")[0];
  var rect = el.getBoundingClientRect();
  if ((rect.left < 0) | (document.body.clientWidth < rect.width)) {
    el.style.position = "fixed";
    el.style.top = rect.top;
    el.style.left = 0;
    el.style.marginLeft = 0;
  } else if (rect.right > document.body.clientWidth) {
    el.style.position = "fixed";
    el.style.top = rect.top;
    el.style.left = document.body.clientWidth - rect.width;
    el.style.marginLeft = 0;
  }
}

function resetTooltipStyles(parent) {
  var el = parent.getElementsByClassName("tooltiptext")[0];
  el.style.position = "";
  el.style.top = "";
  el.style.left = "";
  el.style.marginLeft = "";
}
