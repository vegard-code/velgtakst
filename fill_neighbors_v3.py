#!/usr/bin/env python3
"""
Fyller nabokommuner for alle kommuner i kommune-seo-content.ts
Enklere tilnærming som matcher eksisterende naerliggendeKommuner-arrays
"""

import re
from pathlib import Path

# Dictionary med nabokommuner basert på norsk geografi
neighbors = {
    "oslo": (["barum", "asker", "lillestrom", "lorenskog"], "Oslo grenser mot Bærum mot vest, Asker og Lillestrøm i utkanten, og Lørenskog øst."),
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
    "fredrikstad": (["sarpsborg", "moss", "indre-ostfold", "hvaler"], "Fredrikstad grenser mot Sarpsborg, Moss, Indre Østfold og Hvaler."),
    "sarpsborg": (["fredrikstad", "moss", "rakkestad", "indre-ostfold"], "Sarpsborg grenser mot Fredrikstad, Moss, Rakkestad og Indre Østfold."),
    "moss": (["sarpsborg", "fredrikstad", "rade", "hvaler"], "Moss grenser mot Sarpsborg, Fredrikstad, Råde og Hvaler."),
    "halden": (["marker", "aremark"], "Halden grenser mot Marker og Aremark."),
    "indre-ostfold": (["fredrikstad", "sarpsborg", "rakkestad", "eidskog"], "Indre Østfold grenser mot Fredrikstad, Sarpsborg, Rakkestad og Eidskog."),
    "hvaler": (["moss", "fredrikstad", "rade"], "Hvaler grenser mot Moss, Fredrikstad og Råde."),
    "rakkestad": (["sarpsborg", "indre-ostfold", "skiptvet", "grue"], "Rakkestad grenser mot Sarpsborg, Indre Østfold, Skiptvet og Grue."),
    "rade": (["moss", "hvaler", "valer-ostfold", "marker"], "Råde grenser mot Moss, Hvaler, Våler og Marker."),
    "valer-ostfold": (["rade", "marker", "aremark"], "Våler grenser mot Råde, Marker og Aremark."),
    "skiptvet": (["rakkestad", "grue", "eidskog", "asnes"], "Skiptvet grenser mot Rakkestad, Grue, Eidskog og Åsnes."),
    "marker": (["rade", "valer-ostfold", "aremark", "halden"], "Marker grenser mot Råde, Våler, Aremark og Halden."),
    "aremark": (["marker", "valer-ostfold", "halden"], "Aremark grenser mot Marker, Våler og Halden."),
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
    "nore-og-uvdal": (["hol", "aal", "rollag", "flesberg"], "Nore og Uvdal grenser mot Hol, Ål, Flesberg og Rollag."),
}

seo_file = Path("/sessions/dreamy-gallant-pascal/mnt/takstportal/src/data/kommune-seo-content.ts")
content = seo_file.read_text()

# For hver kommune, erstatt naerliggendeKommuner og naerliggendeText
# Matcher pattern: "kommune": { ... "naerliggendeText": "...", "naerliggendeKommuner": [...] }
updated_count = 0

for kommune_id, (neighbor_list, text) in neighbors.items():
    # Bygg JSON-array for nabokommuner
    neighbor_json = ',\n      '.join(f'"{n}"' for n in neighbor_list)

    # Escape quotes i teksten
    text_escaped = text.replace('"', '\\"')

    # Finn blokken for denne kommunen
    pattern = rf'"{kommune_id}":\s*\{{(?:[^{{}}]|(?:{{[^{{}}]*}})|(?:\[[^\]]*\]))*?"naerliggendeText":\s*"[^"]*"'

    match = re.search(pattern, content, re.DOTALL)
    if match:
        # Finn naerliggendeKommuner innenfor samme blokk
        block_start = match.start()
        # Finn neste }, , eller slutten av blokken
        brace_count = 1
        pos = match.start() + len(f'"{kommune_id}"' + ':')
        while brace_count > 0 and pos < len(content):
            if content[pos] == '{':
                brace_count += 1
            elif content[pos] == '}':
                brace_count -= 1
            pos += 1
        block_end = pos
        block_content = content[block_start:block_end]

        # Erstatt naerliggendeText
        updated_block = re.sub(
            rf'("naerliggendeText":\s*)"[^"]*"',
            rf'\1"{text_escaped}"',
            block_content
        )

        # Erstatt naerliggendeKommuner array
        updated_block = re.sub(
            rf'("naerliggendeKommuner":\s*)\[[^\]]*\]',
            rf'\1[\n      {neighbor_json}\n    ]',
            updated_block
        )

        # Erstatt i original content
        content = content[:block_start] + updated_block + content[block_end:]
        updated_count += 1

print(f"Updated {updated_count} communes")

seo_file.write_text(content)
print(f"Wrote {seo_file}")
