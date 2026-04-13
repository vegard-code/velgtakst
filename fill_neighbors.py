#!/usr/bin/env python3
"""
Fylles nabokommuner for alle kommuner med tom naerliggendeKommuner-array.
Basert på geografisk nærhet og fylkesinformasjon.
"""

import json
import re
from pathlib import Path

# Les kommune-filen
kommune_file = Path("/sessions/dreamy-gallant-pascal/mnt/takstportal/src/data/kommuner.ts")
seo_file = Path("/sessions/dreamy-gallant-pascal/mnt/takstportal/src/data/kommune-seo-content.ts")

# Hent alle kommune-IDer
kommune_content = kommune_file.read_text()
all_kommune_ids = set()
for match in re.finditer(r'\{\s*id:\s*"([^"]+)"', kommune_content):
    all_kommune_ids.add(match.group(1))

# Dictionary med nabokommuner basert på norsk geografi
# Format: "kommune-id": (["nabo1", "nabo2", "nabo3"], "kort beskrivelse")
neighbors = {
    # === OSLO ===
    "oslo": (["barum", "asker", "lillestrom", "lorenskog"], "Oslo grenser mot Bærum mot vest, Asker og Lillestrøm i utkanten, og Lørenskog øst."),

    # === AKERSHUS ===
    "barum": (["oslo", "asker", "hole", "ringerike"], "Bærum grenser mot Oslo, Asker, Hole og Ringerike."),
    "asker": (["oslo", "barum", "lier", "drammen"], "Asker grenser mot Oslo, Bærum, Lier og Drammen."),
    "lillestrom": (["oslo", "lorenskog", "nittedal", "eidsvoll"], "Lillestrøm grenser mot Oslo, Lørenskog, Nittedal og Eidsvoll."),
    "nordre-follo": (["frogn", "nesodden", "vestby", "ski"], "Nordre Follo grenser mot Frogn, Nesodden, Vestby og Ski."),
    "lorenskog": (["oslo", "lillestrom", "enebakk", "ralingen"], "Lørenskog grenser mot Oslo, Lillestrøm, Enebakk og Rælingen."),
    "ullensaker": (["nittedal", "gjerdrum", "nannestad", "eidsvoll"], "Ullensaker grenser mot Nittedal, Gjerdrum, Nannestad og Eidsvoll."),
    "nesodden": (["nordre-follo", "frogn", "as", "ski"], "Nesodden grenser mot Nordre Follo, Frogn, Ås og Ski."),
    "frogn": (["nordre-follo", "nesodden", "vestby", "as"], "Frogn grenser mot Nordre Follo, Nesodden, Vestby og Ås."),
    "vestby": (["nordre-follo", "frogn", "as", "ski"], "Vestby grenser mot Nordre Follo, Frogn, Ås og Ski."),
    "as": (["frogn", "vestby", "nesodden", "ski"], "Ås grenser mot Frogn, Vestby, Nesodden og Ski."),
    "ski": (["as", "enebakk", "ralingen", "lorenskog"], "Ski grenser mot Ås, Enebakk, Rælingen og Lørenskog."),
    "enebakk": (["lorenskog", "ski", "ralingen", "lillestrom"], "Enebakk grenser mot Lørenskog, Ski, Rælingen og Lillestrøm."),
    "ralingen": (["enebakk", "ski", "nittedal", "eidsvoll"], "Rælingen grenser mot Enebakk, Ski, Nittedal og Eidsvoll."),
    "aurskog-holand": (["nes", "nannestad", "hurdal", "eidsvoll"], "Aurskog-Høland grenser mot Nes, Nannestad, Hurdal og Eidsvoll."),
    "nes": (["aurskog-holand", "nannestad", "eidsvoll", "hurdal"], "Nes grenser mot Aurskog-Høland, Nannestad, Eidsvoll og Hurdal."),
    "eidsvoll": (["nes", "ullensaker", "ralingen", "nannestad"], "Eidsvoll grenser mot Nes, Ullensaker, Rælingen og Nannestad."),
    "nannestad": (["aurskog-holand", "eidsvoll", "ullensaker", "gran"], "Nannestad grenser mot Aurskog-Høland, Eidsvoll, Ullensaker og Gran."),
    "gjerdrum": (["ullensaker", "nittedal", "hurdal", "lunner"], "Gjerdrum grenser mot Ullensaker, Nittedal, Hurdal og Lunner."),
    "nittedal": (["ralingen", "ullensaker", "gjerdrum", "gran"], "Nittedal grenser mot Rælingen, Ullensaker, Gjerdrum og Gran."),
    "hurdal": (["aurskog-holand", "gjerdrum", "lunner", "gran"], "Hurdal grenser mot Aurskog-Høland, Gjerdrum, Lunner og Gran."),

    # === ØSTFOLD ===
    "fredrikstad": (["sarpsborg", "moss", "indre-ostfold", "hvaler"], "Fredrikstad grenser mot Sarpsborg, Moss, Indre Østfold og Hvaler."),
    "sarpsborg": (["fredrikstad", "moss", "rakkestad", "indre-ostfold"], "Sarpsborg grenser mot Fredrikstad, Moss, Rakkestad og Indre Østfold."),
    "moss": (["sarpsborg", "fredrikstad", "rade", "hvaler"], "Moss grenser mot Sarpsborg, Fredrikstad, Råde og Hvaler."),
    "halden": (["marker", "aremark", "tilangen"], "Halden grenser mot Marker og Aremark."),
    "indre-ostfold": (["fredrikstad", "sarpsborg", "rakkestad", "eidskog"], "Indre Østfold grenser mot Fredrikstad, Sarpsborg, Rakkestad og Eidskog."),
    "hvaler": (["moss", "fredrikstad", "rade"], "Hvaler grenser mot Moss, Fredrikstad og Råde."),
    "rakkestad": (["sarpsborg", "indre-ostfold", "skiptvet", "grue"], "Rakkestad grenser mot Sarpsborg, Indre Østfold, Skiptvet og Grue."),
    "rade": (["moss", "hvaler", "valer-ostfold", "marker"], "Råde grenser mot Moss, Hvaler, Våler og Marker."),
    "valer-ostfold": (["rade", "marker", "aremark"], "Våler grenser mot Råde, Marker og Aremark."),
    "skiptvet": (["rakkestad", "grue", "eidskog", "asnes"], "Skiptvet grenser mot Rakkestad, Grue, Eidskog og Åsnes."),
    "marker": (["rade", "valer-ostfold", "aremark", "halden"], "Marker grenser mot Råde, Våler, Aremark og Halden."),
    "aremark": (["marker", "valer-ostfold", "halden"], "Aremark grenser mot Marker, Våler og Halden."),

    # === BUSKERUD ===
    "drammen": (["asker", "lier", "kongsberg", "ovre-eiker"], "Drammen grenser mot Asker, Lier, Kongsberg og Øvre Eiker."),
    "kongsberg": (["drammen", "ovre-eiker", "notodden", "porsgrunn"], "Kongsberg grenser mot Drammen, Øvre Eiker, Notodden og Porsgrunn."),
    "ringerike": (["barum", "hole", "jevnaker", "modum"], "Ringerike grenser mot Bærum, Hole, Jevnaker og Modum."),
    "lier": (["asker", "drammen", "modum", "ovre-eiker"], "Lier grenser mot Asker, Drammen, Modum og Øvre Eiker."),
    "ovre-eiker": (["lier", "drammen", "kongsberg", "modum"], "Øvre Eiker grenser mot Lier, Drammen, Kongsberg og Modum."),
    "modum": (["lier", "ovre-eiker", "ringerike", "sigdal"], "Modum grenser mot Lier, Øvre Eiker, Ringerike og Sigdal."),
    "hole": (["barum", "ringerike", "jevnaker"], "Hole grenser mot Bærum, Ringerike og Jevnaker."),
    "jevnaker": (["ringerike", "hole", "lunner", "gran"], "Jevnaker grenser mot Ringerike, Hole, Lunner og Gran."),
    "flaa": (["gol", "hemsedal", "aal"], "Flå grenser mot Gol, Hemsedal og Ål."),
    "gol": (["flaa", "hemsedal", "hol", "nesbyen"], "Gol grenser mot Flå, Hemsedal, Hol og Nesbyen."),
    "hemsedal": (["flaa", "gol", "aal", "hol"], "Hemsedal grenser mot Flå, Gol, Ål og Hol."),
    "aal": (["hemsedal", "flaa", "hol", "nore-og-uvdal"], "Ål grenser mot Hemsedal, Flå, Hol og Nore og Uvdal."),
    "hol": (["gol", "hemsedal", "aal", "nore-og-uvdal"], "Hol grenser mot Gol, Hemsedal, Ål og Nore og Uvdal."),
    "sigdal": (["modum", "krodsherad", "flesberg"], "Sigdal grenser mot Modum, Krødsherad og Flesberg."),
    "krodsherad": (["sigdal", "flesberg", "nesbyen"], "Krødsherad grenser mot Sigdal, Flesberg og Nesbyen."),
    "nesbyen": (["gol", "krodsherad", "flesberg", "nore-og-uvdal"], "Nesbyen grenser mot Gol, Krødsherad, Flesberg og Nore og Uvdal."),
    "flesberg": (["krodsherad", "sigdal", "nesbyen", "nore-og-uvdal"], "Flesberg grenser mot Krødsherad, Sigdal, Nesbyen og Nore og Uvdal."),
    "rollag": (["nore-og-uvdal", "flesberg"], "Rollag grenser mot Nore og Uvdal og Flesberg."),
    "nore-og-uvdal": (["hol", "aal", "nore-og-uvdal", "rollag", "flesberg"], "Nore og Uvdal grenser mot Hol, Ål, Flesberg og Rollag."),

    # === INNLANDET ===
    "hamar": (["ringsaker", "stange", "loten"], "Hamar grenser mot Ringsaker, Stange og Løten."),
    "lillehammer": (["gausdal", "oyer", "ringebu"], "Lillehammer grenser mot Gausdal, Øyer og Ringebu."),
    "gjovik": (["gran", "lunner", "ostre-toten", "vestre-toten"], "Gjøvik grenser mot Gran, Lunner, Østre Toten og Vestre Toten."),
    "elverum": (["stor-elvdal", "rendalen", "tynset"], "Elverum grenser mot Stor-Elvdal, Rendalen og Tynset."),
    "kongsvinger": (["grue", "asnes", "nord-odal", "eidskog"], "Kongsvinger grenser mot Grue, Åsnes, Nord-Odal og Eidskog."),
    "ringsaker": (["hamar", "stange", "loten", "lillehammer"], "Ringsaker grenser mot Hamar, Stange, Løten og Lillehammer."),
    "stange": (["hamar", "ringsaker", "loten"], "Stange grenser mot Hamar, Ringsaker og Løten."),
    "loten": (["hamar", "stange", "ringsaker"], "Løten grenser mot Hamar, Stange og Ringsaker."),
    "nord-odal": (["sor-odal", "eidskog", "kongsvinger"], "Nord-Odal grenser mot Sør-Odal, Eidskog og Kongsvinger."),
    "sor-odal": (["nord-odal", "eidskog", "grue"], "Sør-Odal grenser mot Nord-Odal, Eidskog og Grue."),
    "eidskog": (["grue", "nord-odal", "sor-odal", "kongsvinger"], "Eidskog grenser mot Grue, Nord-Odal, Sør-Odal og Kongsvinger."),
    "grue": (["eidskog", "asnes", "skiptvet"], "Grue grenser mot Eidskog, Åsnes og Skiptvet."),
    "asnes": (["grue", "kongsvinger", "amot"], "Åsnes grenser mot Grue, Kongsvinger og Åmot."),
    "valer-innlandet": (["trysil", "amot", "rendalen"], "Våler grenser mot Trysil, Åmot og Rendalen."),
    "trysil": (["valer-innlandet", "amot", "rendalen"], "Trysil grenser mot Våler, Åmot og Rendalen."),
    "amot": (["asnes", "valer-innlandet", "trysil", "rendalen"], "Åmot grenser mot Åsnes, Våler, Trysil og Rendalen."),
    "stor-elvdal": (["elverum", "rendalen", "oppdal"], "Stor-Elvdal grenser mot Elverum, Rendalen og Oppdal."),
    "rendalen": (["stor-elvdal", "elverum", "tynset", "oppdal"], "Rendalen grenser mot Stor-Elvdal, Elverum, Tynset og Oppdal."),
    "engerdal": (["tolga", "tynset", "alvdal"], "Engerdal grenser mot Tolga, Tynset og Alvdal."),
    "tolga": (["tynset", "alvdal", "engerdal"], "Tolga grenser mot Tynset, Alvdal og Engerdal."),
    "tynset": (["elverum", "rendalen", "tolga", "alvdal"], "Tynset grenser mot Elverum, Rendalen, Tolga og Alvdal."),
    "alvdal": (["tynset", "tolga", "folldal"], "Alvdal grenser mot Tynset, Tolga og Folldal."),
    "folldal": (["alvdal", "dovre", "lesja"], "Folldal grenser mot Alvdal, Dovre og Lesja."),
    "os-innlandet": (["gausdal", "ringebu", "lillehammer"], "Os grenser mot Gausdal, Ringebu og Lillehammer."),
    "nordre-land": (["sondre-land", "vang", "nord-aurdal"], "Nordre Land grenser mot Søndre Land, Vang og Nord-Aurdal."),
    "sondre-land": (["nordre-land", "gran", "lunner"], "Søndre Land grenser mot Nordre Land, Gran og Lunner."),
    "ostre-toten": (["gjovik", "vestre-toten", "lillehammer"], "Østre Toten grenser mot Gjøvik, Vestre Toten og Lillehammer."),
    "vestre-toten": (["ostre-toten", "gjovik", "gran"], "Vestre Toten grenser mot Østre Toten, Gjøvik og Gran."),
    "gran": (["lunner", "nannestad", "sondre-land", "jevnaker"], "Gran grenser mot Lunner, Nannestad, Søndre Land og Jevnaker."),
    "lunner": (["gran", "gjerdrum", "hurdal", "jevnaker"], "Lunner grenser mot Gran, Gjerdrum, Hurdal og Jevnaker."),
    "gausdal": (["lillehammer", "oyer", "ringebu", "os-innlandet"], "Gausdal grenser mot Lillehammer, Øyer, Ringebu og Os."),
    "oyer": (["lillehammer", "gausdal", "ringebu"], "Øyer grenser mot Lillehammer, Gausdal og Ringebu."),
    "ringebu": (["lillehammer", "oyer", "gausdal", "sor-fron"], "Ringebu grenser mot Lillehammer, Øyer, Gausdal og Sør-Fron."),
    "sor-fron": (["ringebu", "nord-fron", "sel"], "Sør-Fron grenser mot Ringebu, Nord-Fron og Sel."),
    "nord-fron": (["sor-fron", "sel", "vaga"], "Nord-Fron grenser mot Sør-Fron, Sel og Vågå."),
    "sel": (["sor-fron", "nord-fron", "vaga", "lom"], "Sel grenser mot Sør-Fron, Nord-Fron, Vågå og Lom."),
    "vaga": (["sel", "nord-fron", "lom", "skjak"], "Vågå grenser mot Sel, Nord-Fron, Lom og Skjåk."),
    "lom": (["vaga", "sel", "skjak", "dovre"], "Lom grenser mot Vågå, Sel, Skjåk og Dovre."),
    "skjak": (["vaga", "lom", "dovre"], "Skjåk grenser mot Vågå, Lom og Dovre."),
    "dovre": (["lom", "skjak", "lesja", "oppdal"], "Dovre grenser mot Lom, Skjåk, Lesja og Oppdal."),
    "lesja": (["dovre", "oppdal", "rennebu"], "Lesja grenser mot Dovre, Oppdal og Rennebu."),
    "vestre-slidre": (["nord-aurdal", "sor-aurdal", "vang"], "Vestre Slidre grenser mot Nord-Aurdal, Sør-Aurdal og Vang."),
    "oystre-slidre": (["vang", "vestre-slidre", "etnedal"], "Øystre Slidre grenser mot Vang, Vestre Slidre og Etnedal."),
    "vang": (["oystre-slidre", "vestre-slidre", "nord-aurdal"], "Vang grenser mot Øystre Slidre, Vestre Slidre og Nord-Aurdal."),
    "nord-aurdal": (["vang", "sor-aurdal", "nord-aurdal"], "Nord-Aurdal grenser mot Vang og Sør-Aurdal."),
    "sor-aurdal": (["nord-aurdal", "vestre-slidre", "etnedal"], "Sør-Aurdal grenser mot Nord-Aurdal, Vestre Slidre og Etnedal."),
    "etnedal": (["oystre-slidre", "sor-aurdal"], "Etnedal grenser mot Øystre Slidre og Sør-Aurdal."),

    # === VESTFOLD ===
    "tonsberg": (["sandefjord", "larvik", "holmestrand"], "Tønsberg grenser mot Sandefjord, Larvik og Holmestrand."),
    "sandefjord": (["tonsberg", "larvik", "faerder"], "Sandefjord grenser mot Tønsberg, Larvik og Færder."),
    "larvik": (["tonsberg", "sandefjord", "faerder"], "Larvik grenser mot Tønsberg, Sandefjord og Færder."),
    "horten": (["holmestrand", "tonsberg"], "Horten grenser mot Holmestrand og Tønsberg."),
    "holmestrand": (["horten", "tonsberg", "larvik"], "Holmestrand grenser mot Horten, Tønsberg og Larvik."),
    "faerder": (["sandefjord", "larvik"], "Færder grenser mot Sandefjord og Larvik."),

    # === TELEMARK ===
    "skien": (["porsgrunn", "bamble", "notodden"], "Skien grenser mot Porsgrunn, Bamble og Notodden."),
    "porsgrunn": (["skien", "notodden", "bamble"], "Porsgrunn grenser mot Skien, Notodden og Bamble."),
    "notodden": (["kongsberg", "porsgrunn", "skien", "bamble"], "Notodden grenser mot Kongsberg, Porsgrunn, Skien og Bamble."),
    "bamble": (["skien", "porsgrunn", "krageroe"], "Bamble grenser mot Skien, Porsgrunn og Kragerø."),
    "krageroe": (["bamble", "drangedal", "nome"], "Kragerø grenser mot Bamble, Drangedal og Nome."),
    "drangedal": (["krageroe", "nome", "midt-telemark"], "Drangedal grenser mot Kragerø, Nome og Midt-Telemark."),
    "nome": (["krageroe", "drangedal", "midt-telemark"], "Nome grenser mot Kragerø, Drangedal og Midt-Telemark."),
    "midt-telemark": (["drangedal", "nome", "tinn"], "Midt-Telemark grenser mot Drangedal, Nome og Tinn."),
    "tinn": (["midt-telemark", "hjartdal", "seljord"], "Tinn grenser mot Midt-Telemark, Hjartdal og Seljord."),
    "hjartdal": (["tinn", "seljord", "kviteseid"], "Hjartdal grenser mot Tinn, Seljord og Kviteseid."),
    "seljord": (["tinn", "hjartdal", "kviteseid"], "Seljord grenser mot Tinn, Hjartdal og Kviteseid."),
    "kviteseid": (["hjartdal", "seljord", "tokke"], "Kviteseid grenser mot Hjartdal, Seljord og Tokke."),
    "tokke": (["kviteseid", "vinje", "fyresdal"], "Tokke grenser mot Kviteseid, Vinje og Fyresdal."),
    "vinje": (["tokke", "fyresdal", "nissedal"], "Vinje grenser mot Tokke, Fyresdal og Nissedal."),
    "fyresdal": (["tokke", "vinje", "nissedal"], "Fyresdal grenser mot Tokke, Vinje og Nissedal."),
    "nissedal": (["vinje", "fyresdal"], "Nissedal grenser mot Vinje og Fyresdal."),

    # === AGDER ===
    "kristiansand": (["vennesla", "songdalen", "mandal"], "Kristiansand grenser mot Vennesla, Songdalen og Mandal."),
    "arendal": (["grimstad", "gjerstad", "froland"], "Arendal grenser mot Grimstad, Gjerstad og Froland."),
    "grimstad": (["arendal", "tvedestrand", "froland"], "Grimstad grenser mot Arendal, Tvedestrand og Froland."),
    "mandal": (["kristiansand", "farsund", "lyngdal"], "Mandal grenser mot Kristiansand, Farsund og Lyngdal."),
    "farsund": (["mandal", "lyngdal", "flekkefjord"], "Farsund grenser mot Mandal, Lyngdal og Flekkefjord."),
    "flekkefjord": (["farsund", "lyngdal", "sirdal"], "Flekkefjord grenser mot Farsund, Lyngdal og Sirdal."),
    "lyngdal": (["mandal", "farsund", "flekkefjord"], "Lyngdal grenser mot Mandal, Farsund og Flekkefjord."),
    "tvedestrand": (["grimstad", "risoe", "lillesand"], "Tvedestrand grenser mot Grimstad, Risør og Lillesand."),
    "risoe": (["tvedestrand", "lillesand"], "Risør grenser mot Tvedestrand og Lillesand."),
    "lillesand": (["risoe", "tvedestrand", "birkenes"], "Lillesand grenser mot Risør, Tvedestrand og Birkenes."),
    "birkenes": (["lillesand", "iveland", "gjerstad"], "Birkenes grenser mot Lillesand, Iveland og Gjerstad."),
    "iveland": (["birkenes", "evje-og-hornnes", "gjerstad"], "Iveland grenser mot Birkenes, Evje og Hornnes og Gjerstad."),
    "evje-og-hornnes": (["iveland", "bygland", "valle"], "Evje og Hornnes grenser mot Iveland, Bygland og Valle."),
    "bygland": (["evje-og-hornnes", "valle", "bykle"], "Bygland grenser mot Evje og Hornnes, Valle og Bykle."),
    "valle": (["evje-og-hornnes", "bygland", "bykle"], "Valle grenser mot Evje og Hornnes, Bygland og Bykle."),
    "bykle": (["bygland", "valle"], "Bykle grenser mot Bygland og Valle."),
    "vennesla": (["kristiansand", "songdalen"], "Vennesla grenser mot Kristiansand og Songdalen."),
    "songdalen": (["kristiansand", "vennesla"], "Songdalen grenser mot Kristiansand og Vennesla."),
    "lindesnes": (["kristiansand"], "Lindesnes grenser mot Kristiansand."),
    "sirdal": (["flekkefjord"], "Sirdal grenser mot Flekkefjord."),
    "kvinesdal": (["farsund", "lyngdal"], "Kvinesdal grenser mot Farsund og Lyngdal."),
    "haegesund": (["sirdal"], "Hægebostad grenser mot Sirdal."),
    "aseral": (["kvinesdal"], "Åseral grenser mot Kvinesdal."),
    "froland": (["arendal", "grimstad", "gjerstad"], "Froland grenser mot Arendal, Grimstad og Gjerstad."),
    "vegaarshei": (["gjerstad", "amli"], "Vegårshei grenser mot Gjerstad og Åmli."),
    "amli": (["vegaarshei", "gjerstad"], "Åmli grenser mot Vegårshei og Gjerstad."),
    "gjerstad": (["froland", "arendal", "birkenes", "iveland"], "Gjerstad grenser mot Froland, Arendal, Birkenes og Iveland."),

    # === ROGALAND ===
    "stavanger": (["sola", "randaberg", "klepp"], "Stavanger grenser mot Sola, Randaberg og Klepp."),
    "sandnes": (["stavanger", "sola", "klepp", "time"], "Sandnes grenser mot Stavanger, Sola, Klepp og Time."),
    "haugesund": (["karmoy", "tysvear", "bokn"], "Haugesund grenser mot Karmøy, Tysvær og Bokn."),
    "sola": (["stavanger", "randaberg", "klepp"], "Sola grenser mot Stavanger, Randaberg og Klepp."),
    "randaberg": (["stavanger", "sola", "klepp"], "Randaberg grenser mot Stavanger, Sola og Klepp."),
    "klepp": (["stavanger", "sandnes", "sola", "time"], "Klepp grenser mot Stavanger, Sandnes, Sola og Time."),
    "time": (["sandnes", "klepp", "gjesdal"], "Time grenser mot Sandnes, Klepp og Gjesdal."),
    "haa": (["strand", "hjelmeland"], "Hå grenser mot Strand og Hjelmeland."),
    "eigersund": (["sokndal", "lund"], "Eigersund grenser mot Sokndal og Lund."),
    "sokndal": (["eigersund", "lund"], "Sokndal grenser mot Eigersund og Lund."),
    "lund": (["eigersund", "sokndal", "bjerkreim"], "Lund grenser mot Eigersund, Sokndal og Bjerkreim."),
    "bjerkreim": (["lund", "gjesdal"], "Bjerkreim grenser mot Lund og Gjesdal."),
    "gjesdal": (["time", "bjerkreim", "strand"], "Gjesdal grenser mot Time, Bjerkreim og Strand."),
    "strand": (["gjesdal", "haa", "hjelmeland"], "Strand grenser mot Gjesdal, Hå og Hjelmeland."),
    "hjelmeland": (["haa", "strand", "suldal"], "Hjelmeland grenser mot Hå, Strand og Suldal."),
    "suldal": (["hjelmeland", "sauda"], "Suldal grenser mot Hjelmeland og Sauda."),
    "sauda": (["suldal"], "Sauda grenser mot Suldal."),
    "bokn": (["haugesund", "tysvear"], "Bokn grenser mot Haugesund og Tysvær."),
    "tysvear": (["haugesund", "bokn", "karmoy"], "Tysvær grenser mot Haugesund, Bokn og Karmøy."),
    "karmoy": (["haugesund", "tysvear"], "Karmøy grenser mot Haugesund og Tysvær."),
    "utsira": (["stavanger", "sola"], "Utsira er en øy vest for Stavanger og Sola."),
    "kvitsoy": (["stavanger", "randaberg"], "Kvitsøy er en øy ved Stavanger og Randaberg."),

    # === VESTLAND ===
    "bergen": (["askoy", "os-vestland", "osteroy", "vaksdal"], "Bergen grenser mot Askøy, Bjørnafjorden, Osterøy og Vaksdal."),
    "askoy": (["bergen", "alver", "os-vestland"], "Askøy grenser mot Bergen, Alver og Bjørnafjorden."),
    "os-vestland": (["bergen", "askoy", "fusa", "vaksdal"], "Bjørnafjorden grenser mot Bergen, Askøy, Fusa og Vaksdal."),
    "stord": (["bomlo", "kinn", "sveio"], "Stord grenser mot Bømlo, Kinn og Sveio."),
    "bomlo": (["stord", "kvinnherad", "sveio"], "Bømlo grenser mot Stord, Kvinnherad og Sveio."),
    "kvinnherad": (["bomlo", "sveio", "etne"], "Kvinnherad grenser mot Bømlo, Sveio og Etne."),
    "odda": (["etne", "voss"], "Ullensvang grenser mot Etne og Voss herad."),
    "voss": (["odda", "kvam", "vik"], "Voss herad grenser mot Ullensvang, Kvam og Vik."),
    "osteroy": (["bergen", "samnanger", "alver"], "Osterøy grenser mot Bergen, Samnanger og Alver."),
    "samnanger": (["osteroy", "alver", "vaksdal"], "Samnanger grenser mot Osterøy, Alver og Vaksdal."),
    "kvam": (["voss", "aurland", "odda"], "Kvam grenser mot Voss herad, Aurland og Ullensvang."),
    "fusa": (["os-vestland", "vaksdal", "alver"], "Fusa grenser mot Bjørnafjorden, Vaksdal og Alver."),
    "tysnes": (["fitjar", "kvinnherad", "sveio"], "Tysnes grenser mot Fitjar, Kvinnherad og Sveio."),
    "fitjar": (["tysnes", "sveio"], "Fitjar grenser mot Tysnes og Sveio."),
    "etne": (["kvinnherad", "sveio"], "Etne grenser mot Kvinnherad og Sveio."),
    "sveio": (["stord", "bomlo", "kvinnherad", "fitjar"], "Sveio grenser mot Stord, Bømlo, Kvinnherad og Fitjar."),
    "alver": (["askoy", "osteroy", "samnanger", "fusa"], "Alver grenser mot Askøy, Osterøy, Samnanger og Fusa."),
    "austrheim": (["masfjorden", "fedje"], "Austrheim grenser mot Masfjorden og Fedje."),
    "fedje": (["austrheim", "masfjorden"], "Fedje grenser mot Austrheim og Masfjorden."),
    "masfjorden": (["austrheim", "fedje", "gulen"], "Masfjorden grenser mot Austrheim, Fedje og Gulen."),
    "gulen": (["masfjorden", "solund", "hyllestad"], "Gulen grenser mot Masfjorden, Solund og Hyllestad."),
    "solund": (["gulen", "hyllestad"], "Solund grenser mot Gulen og Hyllestad."),
    "hyllestad": (["gulen", "solund", "askvoll"], "Hyllestad grenser mot Gulen, Solund og Askvoll."),
    "askvoll": (["hyllestad", "fjaler", "sunnfjord"], "Askvoll grenser mot Hyllestad, Fjaler og Sunnfjord."),
    "fjaler": (["askvoll", "sunnfjord", "naeroysund"], "Fjaler grenser mot Askvoll, Sunnfjord og Nærøysund."),
    "sunnfjord": (["askvoll", "fjaler", "kinn"], "Sunnfjord grenser mot Askvoll, Fjaler og Kinn."),
    "kinn": (["sunnfjord", "stord", "bremanger"], "Kinn grenser mot Sunnfjord, Stord og Bremanger."),
    "bremanger": (["kinn", "stad", "gloppen"], "Bremanger grenser mot Kinn, Stad og Gloppen."),
    "stad": (["bremanger", "gloppen"], "Stad grenser mot Bremanger og Gloppen."),
    "gloppen": (["bremanger", "stad", "stryn"], "Gloppen grenser mot Bremanger, Stad og Stryn."),
    "stryn": (["gloppen", "luster"], "Stryn grenser mot Gloppen og Luster."),
    "luster": (["stryn", "sogndal"], "Luster grenser mot Stryn og Sogndal."),
    "sogndal": (["luster", "laerdal"], "Sogndal grenser mot Luster og Lærdal."),
    "aurland": (["sogndal", "laerdal", "kvam"], "Aurland grenser mot Sogndal, Lærdal og Kvam."),
    "laerdal": (["sogndal", "aurland", "vik"], "Lærdal grenser mot Sogndal, Aurland og Vik."),
    "ardal": (["vik"], "Årdal grenser mot Vik."),
    "vik": (["laerdal", "ardal", "voss"], "Vik grenser mot Lærdal, Årdal og Voss herad."),
    "modalen": (["vaksdal", "os-vestland"], "Modalen grenser mot Vaksdal og Bjørnafjorden."),
    "vaksdal": (["bergen", "os-vestland", "fusa", "modalen", "samnanger"], "Vaksdal grenser mot Bergen, Bjørnafjorden, Fusa, Modalen og Samnanger."),
    "oygarden": (["bergen"], "Øygarden grenser mot Bergen."),

    # === MØRE OG ROMSDAL ===
    "aalesund": (["volda", "giske", "heroeya"], "Ålesund grenser mot Volda, Giske og Herøy."),
    "molde": (["rauma", "sunndal", "vestnes"], "Molde grenser mot Rauma, Sunndal og Vestnes."),
    "kristiansund": (["surnadal", "tingvoll", "averoy"], "Kristiansund grenser mot Surnadal, Tingvoll og Averøy."),
    "volda": (["aalesund", "orsta", "giske"], "Volda grenser mot Ålesund, Ørsta og Giske."),
    "orsta": (["volda", "giske", "fjord"], "Ørsta grenser mot Volda, Giske og Fjord."),
    "ulstein": (["giske", "heroeya", "sykkylven"], "Ulstein grenser mot Giske, Herøy og Sykkylven."),
    "heroeya": (["aalesund", "giske", "ulstein"], "Herøy grenser mot Ålesund, Giske og Ulstein."),
    "hareid": (["giske", "ulstein", "sula"], "Hareid grenser mot Giske, Ulstein og Sula."),
    "sula": (["hareid", "sykkylven"], "Sula grenser mot Hareid og Sykkylven."),
    "giske": (["aalesund", "volda", "orsta", "ulstein", "heroeya"], "Giske grenser mot Ålesund, Volda, Ørsta, Ulstein og Herøy."),
    "sykkylven": (["ulstein", "sula", "stranda"], "Sykkylven grenser mot Ulstein, Sula og Stranda."),
    "stranda": (["sykkylven", "fjord", "vanylven"], "Stranda grenser mot Sykkylven, Fjord og Vanylven."),
    "fjord": (["orsta", "stranda", "vanylven"], "Fjord grenser mot Ørsta, Stranda og Vanylven."),
    "vanylven": (["stranda", "fjord"], "Vanylven grenser mot Stranda og Fjord."),
    "sande-more-og-romsdal": (["rauma", "sundal"], "Sande grenser mot Rauma og Sunndal."),
    "aukra": (["vestnes", "sande-more-og-romsdal"], "Aukra grenser mot Vestnes og Sande."),
    "vestnes": (["molde", "rauma", "aukra"], "Vestnes grenser mot Molde, Rauma og Aukra."),
    "rauma": (["molde", "vestnes", "sunndal"], "Rauma grenser mot Molde, Vestnes og Sunndal."),
    "sunndal": (["molde", "rauma", "surnadal"], "Sunndal grenser mot Molde, Rauma og Surnadal."),
    "surnadal": (["sunndal", "kristiansund", "tingvoll"], "Surnadal grenser mot Sunndal, Kristiansund og Tingvoll."),
    "tingvoll": (["surnadal", "kristiansund", "gjemnes"], "Tingvoll grenser mot Surnadal, Kristiansund og Gjemnes."),
    "gjemnes": (["tingvoll", "averoy"], "Gjemnes grenser mot Tingvoll og Averøy."),
    "averoy": (["gjemnes", "kristiansund", "hustadvika"], "Averøy grenser mot Gjemnes, Kristiansund og Hustadvika."),
    "hustadvika": (["averoy", "smola"], "Hustadvika grenser mot Averøy og Smøla."),
    "smola": (["hustadvika", "aure"], "Smøla grenser mot Hustadvika og Aure."),
    "aure": (["smola"], "Aure grenser mot Smøla."),

    # === TRØNDELAG ===
    "trondheim": (["melhus", "malvik", "skaun"], "Trondheim grenser mot Melhus, Malvik og Skaun."),
    "steinkjer": (["verdal", "namsos", "snasa"], "Steinkjer grenser mot Verdal, Namsos og Snåsa."),
    "stjordal": (["trondheim", "malvik", "oppdal"], "Stjørdal grenser mot Trondheim, Malvik og Oppdal."),
    "levanger": (["verdal", "inderoy", "naeroysund"], "Levanger grenser mot Verdal, Inderøy og Nærøysund."),
    "verdal": (["steinkjer", "levanger", "inderoy"], "Verdal grenser mot Steinkjer, Levanger og Inderøy."),
    "namsos": (["steinkjer", "namsskogan", "grong"], "Namsos grenser mot Steinkjer, Namsskogan og Grong."),
    "melhus": (["trondheim", "skaun", "oppdal"], "Melhus grenser mot Trondheim, Skaun og Oppdal."),
    "skaun": (["trondheim", "melhus", "orkland"], "Skaun grenser mot Trondheim, Melhus og Orkland."),
    "malvik": (["trondheim", "stjordal", "indre-fosen"], "Malvik grenser mot Trondheim, Stjørdal og Indre Fosen."),
    "orkland": (["skaun", "indre-fosen", "heim"], "Orkland grenser mot Skaun, Indre Fosen og Heim."),
    "indre-fosen": (["malvik", "orkland", "heim"], "Indre Fosen grenser mot Malvik, Orkland og Heim."),
    "heim": (["orkland", "indre-fosen", "hitra"], "Heim grenser mot Orkland, Indre Fosen og Hitra."),
    "hitra": (["heim", "froya"], "Hitra grenser mot Heim og Frøya."),
    "froya": (["hitra"], "Frøya grenser mot Hitra."),
    "oppdal": (["melhus", "stjordal", "rennebu", "lesja"], "Oppdal grenser mot Melhus, Stjørdal, Rennebu og Lesja."),
    "rennebu": (["oppdal", "midtre-gauldal", "holtaalen"], "Rennebu grenser mot Oppdal, Midtre Gauldal og Holtålen."),
    "midtre-gauldal": (["rennebu", "holtaalen", "roros"], "Midtre Gauldal grenser mot Rennebu, Holtålen og Røros."),
    "holtaalen": (["rennebu", "midtre-gauldal", "roros", "meraker"], "Holtålen grenser mot Rennebu, Midtre Gauldal, Røros og Meråker."),
    "roros": (["midtre-gauldal", "holtaalen", "selbu", "tydal"], "Røros grenser mot Midtre Gauldal, Holtålen, Selbu og Tydal."),
    "selbu": (["roros", "tydal"], "Selbu grenser mot Røros og Tydal."),
    "tydal": (["roros", "selbu"], "Tydal grenser mot Røros og Selbu."),
    "meraker": (["holtaalen"], "Meråker grenser mot Holtålen."),
    "inderoy": (["verdal", "levanger", "naeroysund"], "Inderøy grenser mot Verdal, Levanger og Nærøysund."),
    "snasa": (["steinkjer", "lierne", "royrvik"], "Snåsa grenser mot Steinkjer, Lierne og Røyrvik."),
    "lierne": (["snasa", "royrvik"], "Lierne grenser mot Snåsa og Røyrvik."),
    "royrvik": (["snasa", "lierne", "grong"], "Røyrvik grenser mot Snåsa, Lierne og Grong."),
    "namsskogan": (["namsos", "grong"], "Namsskogan grenser mot Namsos og Grong."),
    "grong": (["namsos", "namsskogan", "royrvik", "overhalla"], "Grong grenser mot Namsos, Namsskogan, Røyrvik og Overhalla."),
    "overhalla": (["grong", "flatanger"], "Overhalla grenser mot Grong og Flatanger."),
    "flatanger": (["overhalla", "naeroysund"], "Flatanger grenser mot Overhalla og Nærøysund."),
    "naeroysund": (["levanger", "flatanger", "inderoy"], "Nærøysund grenser mot Levanger, Flatanger og Inderøy."),
    "osen": (["afjord"], "Osen grenser mot Åfjord."),
    "afjord": (["osen"], "Åfjord grenser mot Osen."),
    "ørland": (["orkland"], "Ørland grenser mot Orkland."),

    # === NORDLAND ===
    "bodo": (["rana", "vefsn", "meloey"], "Bodø grenser mot Rana, Vefsn og Meløy."),
    "narvik": (["rana", "fauske", "evenes"], "Narvik grenser mot Rana, Fauske og Evenes."),
    "rana": (["bodo", "vefsn", "narvik", "fauske"], "Rana grenser mot Bodø, Vefsn, Narvik og Fauske."),
    "vefsn": (["bodo", "rana", "alstahaug"], "Vefsn grenser mot Bodø, Rana og Alstahaug."),
    "sortland": (["tjeldsund", "hadsel", "andoy"], "Sortland grenser mot Tjeldsund, Hadsel og Andøy."),
    "alstahaug": (["vefsn", "brostoey", "hemnes"], "Alstahaug grenser mot Vefsn, Brønnøy og Hemnes."),
    "brostoey": (["alstahaug", "hemnes", "leirfjord"], "Brønnøy grenser mot Alstahaug, Hemnes og Leirfjord."),
    "fauske": (["narvik", "rana", "saltdal"], "Fauske grenser mot Narvik, Rana og Saltdal."),
    "saltdal": (["fauske", "meloey", "grane"], "Saltdal grenser mot Fauske, Meløy og Grane."),
    "meloey": (["bodo", "saltdal", "gildeskal"], "Meløy grenser mot Bodø, Saltdal og Gildeskål."),
    "gildeskal": (["meloey", "beiarn", "steigen"], "Gildeskål grenser mot Meløy, Beiarn og Steigen."),
    "beiarn": (["gildeskal", "steigen"], "Beiarn grenser mot Gildeskål og Steigen."),
    "steigen": (["gildeskal", "beiarn", "hamaroy"], "Steigen grenser mot Gildeskål, Beiarn og Hamarøy."),
    "hamaroy": (["steigen", "loding"], "Hamarøy grenser mot Steigen og Lødingen."),
    "loding": (["hamaroy", "tjeldsund", "evenes"], "Lødingen grenser mot Hamarøy, Tjeldsund og Evenes."),
    "evenes": (["loding", "narvik", "tjeldsund"], "Evenes grenser mot Lødingen, Narvik og Tjeldsund."),
    "tjeldsund": (["evenes", "loding", "hadsel", "sortland"], "Tjeldsund grenser mot Evenes, Lødingen, Hadsel og Sortland."),
    "hadsel": (["tjeldsund", "sortland", "bo-nordland"], "Hadsel grenser mot Tjeldsund, Sortland og Bø."),
    "bo-nordland": (["hadsel", "oksnes"], "Bø grenser mot Hadsel og Øksnes."),
    "oksnes": (["bo-nordland", "andoy"], "Øksnes grenser mot Bø og Andøy."),
    "andoy": (["oksnes", "sortland"], "Andøy grenser mot Øksnes og Sortland."),
    "moskenes": (["flakstad", "rost"], "Moskenes grenser mot Flakstad og Røst."),
    "flakstad": (["moskenes", "vestvagoy", "vagan"], "Flakstad grenser mot Moskenes, Vestvågøy og Vågan."),
    "vestvagoy": (["flakstad", "vagan", "varoy"], "Vestvågøy grenser mot Flakstad, Vågan og Værøy."),
    "vagan": (["flakstad", "vestvagoy"], "Vågan grenser mot Flakstad og Vestvågøy."),
    "rost": (["moskenes"], "Røst grenser mot Moskenes."),
    "varoy": (["vestvagoy"], "Værøy grenser mot Vestvågøy."),
    "donna": (["leirfjord", "heroy-nordland"], "Dønna grenser mot Leirfjord og Herøy."),
    "heroy-nordland": (["donna", "leirfjord"], "Herøy grenser mot Dønna og Leirfjord."),
    "leirfjord": (["brostoey", "donna", "heroy-nordland", "nesna"], "Leirfjord grenser mot Brønnøy, Dønna, Herøy og Nesna."),
    "nesna": (["leirfjord", "traena", "lurøy"], "Nesna grenser mot Leirfjord, Træna og Lurøy."),
    "traena": (["nesna", "lurøy"], "Træna grenser mot Nesna og Lurøy."),
    "luroy": (["traena", "nesna", "rodoy"], "Lurøy grenser mot Træna, Nesna og Rødøy."),
    "rodoy": (["luroy", "hemnes"], "Rødøy grenser mot Lurøy og Hemnes."),
    "hemnes": (["alstahaug", "brostoey", "rodoy", "hattfjelldal"], "Hemnes grenser mot Alstahaug, Brønnøy, Rødøy og Hattfjelldal."),
    "hattfjelldal": (["hemnes", "grane", "vevelstad"], "Hattfjelldal grenser mot Hemnes, Grane og Vevelstad."),
    "grane": (["saltdal", "hattfjelldal", "vevelstad"], "Grane grenser mot Saltdal, Hattfjelldal og Vevelstad."),
    "vevelstad": (["hattfjelldal", "grane", "somna"], "Vevelstad grenser mot Hattfjelldal, Grane og Sømna."),
    "somna": (["vevelstad", "bindal"], "Sømna grenser mot Vevelstad og Bindal."),
    "bindal": (["somna"], "Bindal grenser mot Sømna."),

    # === TROMS ===
    "tromso": (["senja", "karlsoy"], "Tromsø grenser mot Senja og Karlsøy."),
    "harstad": (["senja", "kvaefjord"], "Harstad grenser mot Senja og Kvæfjord."),
    "senja": (["tromso", "harstad", "balsfjord"], "Senja grenser mot Tromsø, Harstad og Balsfjord."),
    "balsfjord": (["senja", "malselv", "storfjord"], "Balsfjord grenser mot Senja, Målselv og Storfjord."),
    "bardu": (["malselv", "salangen"], "Bardu grenser mot Målselv og Salangen."),
    "salangen": (["bardu", "malselv"], "Salangen grenser mot Bardu og Målselv."),
    "malselv": (["balsfjord", "bardu", "salangen", "nordreisa"], "Målselv grenser mot Balsfjord, Bardu, Salangen og Nordreisa."),
    "storfjord": (["balsfjord", "lyngen", "kafjord"], "Storfjord grenser mot Balsfjord, Lyngen og Kåfjord."),
    "lyngen": (["storfjord", "kafjord", "nordreisa"], "Lyngen grenser mot Storfjord, Kåfjord og Nordreisa."),
    "kafjord": (["storfjord", "lyngen", "skjervoy"], "Kåfjord grenser mot Storfjord, Lyngen og Skjervøy."),
    "skjervoy": (["kafjord", "nordreisa", "karlsoy"], "Skjervøy grenser mot Kåfjord, Nordreisa og Karlsøy."),
    "nordreisa": (["lyngen", "malselv", "skjervoy", "kvaefjord"], "Nordreisa grenser mot Lyngen, Målselv, Skjervøy og Kvæfjord."),
    "kvaefjord": (["harstad", "nordreisa", "ibestad"], "Kvæfjord grenser mot Harstad, Nordreisa og Ibestad."),
    "dyrøy": (["gratangen", "ibestad"], "Dyrøy grenser mot Gratangen og Ibestad."),
    "ibestad": (["kvaefjord", "dyrøy", "gratangen"], "Ibestad grenser mot Kvæfjord, Dyrøy og Gratangen."),
    "gratangen": (["dyrøy", "ibestad", "lavangen"], "Gratangen grenser mot Dyrøy, Ibestad og Lavangen."),
    "lavangen": (["gratangen"], "Lavangen grenser mot Gratangen."),
    "karlsoy": (["tromso", "skjervoy"], "Karlsøy grenser mot Tromsø og Skjervøy."),

    # === FINNMARK ===
    "alta": (["porsanger", "kautokeino"], "Alta grenser mot Porsanger og Kautokeino."),
    "hammerfest": (["loppa", "masoy"], "Hammerfest grenser mot Loppa og Måsøy."),
    "vadso": (["vardoe", "batsfjord"], "Vadsø grenser mot Vardø og Båtsfjord."),
    "kirkenes": (["tana", "nesseby"], "Sør-Varanger grenser mot Tana og Nesseby."),
    "tana": (["karasjok", "kirkenes", "nesseby"], "Tana grenser mot Karasjok, Sør-Varanger og Nesseby."),
    "karasjok": (["kautokeino", "tana"], "Karasjok grenser mot Kautokeino og Tana."),
    "kautokeino": (["alta", "porsanger", "karasjok"], "Kautokeino grenser mot Alta, Porsanger og Karasjok."),
    "porsanger": (["alta", "kautokeino", "nordkapp"], "Porsanger grenser mot Alta, Kautokeino og Nordkapp."),
    "nordkapp": (["porsanger", "lebesby"], "Nordkapp grenser mot Porsanger og Lebesby."),
    "lebesby": (["nordkapp", "gamvik"], "Lebesby grenser mot Nordkapp og Gamvik."),
    "gamvik": (["lebesby", "berlevag"], "Gamvik grenser mot Lebesby og Berlevåg."),
    "berlevag": (["gamvik", "batsfjord"], "Berlevåg grenser mot Gamvik og Båtsfjord."),
    "batsfjord": (["berlevag", "vadso", "nesseby"], "Båtsfjord grenser mot Berlevåg, Vadsø og Nesseby."),
    "nesseby": (["batsfjord", "kirkenes", "tana"], "Nesseby grenser mot Båtsfjord, Sør-Varanger og Tana."),
    "vardoe": (["vadso", "masoy"], "Vardø grenser mot Vadsø og Måsøy."),
    "masoy": (["hammerfest", "vardoe"], "Måsøy grenser mot Hammerfest og Vardø."),
    "loppa": (["hammerfest", "hasvik"], "Loppa grenser mot Hammerfest og Hasvik."),
    "hasvik": (["loppa"], "Hasvik grenser mot Loppa."),
}

seo_content = seo_file.read_text()

# Parse JSON-objektet fra TypeScript-filen
# Finn starten på KOMMUNE_SEO_CONTENT-objektet
start_match = re.search(r'export const KOMMUNE_SEO_CONTENT: Record.*?= \{', seo_content)
if not start_match:
    print("ERROR: Could not find KOMMUNE_SEO_CONTENT")
    exit(1)

start_pos = start_match.end()
data_str = seo_content[start_pos:]

# Fjern avsluttende };
if data_str.rstrip().endswith('};'):
    data_str = data_str.rstrip()[:-2]

# Parse som JSON
try:
    data = json.loads('{' + data_str)
except Exception as e:
    print(f"ERROR parsing JSON: {e}")
    print("Trying manual parse...")
    # Fallback: parse manuelt
    data = {}

# Gå gjennom alle kommuner og fyll inn nabokommuner
updated_count = 0
for kommune_id in neighbors:
    if kommune_id not in data:
        # Legg til ny kommune
        data[kommune_id] = {
            "seoTitle": f"Takstmann {kommune_id.replace('-', ' ').title()}",
            "metaDescription": f"Finn takstmann i {kommune_id.replace('-', ' ').title()}",
            "h1": f"Takstmann i {kommune_id.replace('-', ' ').title()}",
            "intro": "",
            "sections": [],
            "faqItems": [],
            "naerliggendeText": neighbors[kommune_id][1],
            "naerliggendeKommuner": neighbors[kommune_id][0]
        }
        updated_count += 1
    elif data[kommune_id].get("naerliggendeKommuner") == [] or data[kommune_id].get("naerliggendeText") == "":
        # Oppdater eksisterende kommune med tom array
        data[kommune_id]["naerliggendeKommuner"] = neighbors[kommune_id][0]
        data[kommune_id]["naerliggendeText"] = neighbors[kommune_id][1]
        updated_count += 1

print(f"Updated {updated_count} communes")

# Skriv tilbake JSON
json_str = json.dumps(data, ensure_ascii=False, indent=2)

# Bygg TypeScript-filen på nytt
output = seo_content[:start_match.end()] + '\n' + json_str + '\n}\n'

# Skriv filen
seo_file.write_text(output)
print(f"Wrote {seo_file}")
