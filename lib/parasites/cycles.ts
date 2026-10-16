// Parasite life cycles for the 3D lab: tropical liver fluke (Fasciola gigantica),
// tropical theileriosis (Theileria annulata) and the barber's pole worm
// (Haemonchus contortus). Each stage is a station on a ring around the host
// animal; the guided movie walks the ring. Clinical content: to be reviewed by a vet.
// Drug names are given without doses on purpose — follow the label and local advice.

export type ParasiteId = 'fluke' | 'theileria' | 'haemonchus';
export type HostKind = 'buffalo' | 'cow' | 'sheep';

export type ModelId =
  | 'flukeAdult'
  | 'flukeEgg'
  | 'miracidium'
  | 'snail'
  | 'cercaria'
  | 'metacercaria'
  | 'excyst'
  | 'flukeJuvenile'
  | 'tick'
  | 'sporozoite'
  | 'schizont'
  | 'merozoite'
  | 'piroplasm'
  | 'tickNymph'
  | 'rayBodies'
  | 'kinete'
  | 'salivary'
  | 'wormAdult'
  | 'strongyleEgg'
  | 'larvaL1'
  | 'larvaL2'
  | 'larvaL3'
  | 'grassL3'
  | 'exsheath'
  | 'larvaL4';

export type Habitat = 'host' | 'blood' | 'water' | 'snail' | 'pasture' | 'dung' | 'tick' | 'shed';

/** Points the bubbles point at: on/in the host, or out in the world. */
export type AnchorId =
  | 'liver'
  | 'duodenum'
  | 'mouth'
  | 'rumen'
  | 'abomasum'
  | 'prescapular'
  | 'prefemoral'
  | 'udder'
  | 'perineum'
  | 'jugular'
  | 'jaw'
  | 'dung'
  | 'canal'
  | 'canalEdge'
  | 'snailBank'
  | 'pasture'
  | 'wall';

/** Paths the parasite travels inside the host (drawn in the see-through animal). */
export type HostPathId = 'liverToRectum' | 'mouthToGut' | 'gutToLiver' | 'biteToNode' | 'nodeToBlood' | 'abomasumToRectum' | 'mouthToRumen' | 'rumenToAbomasum';

export interface Stage {
  id: string;
  /** Number shown on the bubble. */
  n: number;
  name: string;
  /** Short name for the moving token and chips. */
  short: string;
  habitat: Habitat;
  /** Position on the ring (degrees): 0 = towards the head, 90 = towards you, 180 = tail end, 270 = behind. */
  angle: number;
  anchor: AnchorId;
  model: ModelId;
  /** Real size, e.g. "0.15 mm". */
  size: string;
  /** Magnification shown on the bubble. */
  mag: string;
  where: string;
  time: string;
  what: string;
  field?: string;
  infective?: boolean;
}

export interface CycleScene {
  id: string;
  title: string;
  /** Stage in focus; none = the whole cycle. */
  stage?: string;
  /** Look at this place in the see-through animal instead of the bubble. */
  hostView?: AnchorId;
  text: string;
  move?: { to: string; text: string; via?: HostPathId };
  note?: string;
  lookSec?: number;
  moveSec?: number;
}

export interface Control {
  id: string;
  name: string;
  /** Stages this measure stops. */
  targets: string[];
  how: string;
  note?: string;
}

export interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface Parasite {
  id: ParasiteId;
  name: string;
  latin: string;
  disease: string;
  group: string;
  host: HostKind;
  hostLabel: string;
  hosts: string;
  needs: string;
  stages: Stage[];
  scenes: CycleScene[];
  controls: Control[];
  signs: string[];
  diagnosis: string[];
  treatment: string[];
  season: string;
  quiz: QuizQ[];
  facts: { infected: string; middle: string; site: string; prepatent: string; key: string; diagnosis: string; drugs: string; control: string };
}

// ======================================================================================
// Tropical liver fluke
// ======================================================================================

const FLUKE: Parasite = {
  id: 'fluke',
  name: 'Liver fluke',
  latin: 'Fasciola gigantica',
  disease: 'Fasciolosis (liver fluke disease)',
  group: 'Trematode (fluke)',
  host: 'buffalo',
  hostLabel: 'Buffalo',
  hosts: 'Buffalo, cattle, sheep and goats (and other grazing animals; people occasionally).',
  needs: 'Needs a water snail (Lymnaea) to complete its cycle — so it follows water: canals, ponds, paddy fields, leaking troughs.',
  stages: [
    {
      id: 'adult',
      n: 1,
      name: 'Adult flukes in the bile ducts',
      short: 'Adult fluke',
      habitat: 'host',
      angle: 285,
      anchor: 'liver',
      model: 'flukeAdult',
      size: '2.5–7.5 cm long',
      mag: 'life size ×1.5',
      where: 'Bile ducts of the liver',
      time: 'Live for a year or more in buffalo and cattle; years in sheep',
      what: 'Leaf-shaped, grey-brown flukes. They feed on blood and damage the lining of the bile ducts. Each fluke lays thousands of eggs a day; the eggs flow with the bile into the intestine.',
      field:
        'Chronic fluke: anaemia, bottle jaw, weight loss, less milk, poor fertility. In cattle and buffalo the bile ducts thicken and calcify — the “pipe-stem” liver seen at slaughter.',
    },
    {
      id: 'egg',
      n: 2,
      name: 'Eggs in the dung',
      short: 'Egg',
      habitat: 'dung',
      angle: 200,
      anchor: 'dung',
      model: 'flukeEgg',
      size: 'about 0.16–0.19 mm',
      mag: '×300',
      where: 'Dung, then water',
      time: 'Develop in about 2–3 weeks once in warm water; dry dung kills them',
      what: 'Large oval eggs, yellow-brown (stained by bile) with a lid at one end (operculum). They are NOT yet developed when passed — they must reach water to develop.',
      field:
        'Sedimentation test of dung: fluke eggs are golden yellow-brown with a lid. Amphistome (rumen fluke) eggs are similar in size but clear/greyish with visible cells. Eggs appear only after the flukes are adult — young flukes in the liver give a negative test.',
    },
    {
      id: 'miracidium',
      n: 3,
      name: 'Miracidium hatches and swims',
      short: 'Miracidium',
      habitat: 'water',
      angle: 152,
      anchor: 'canal',
      model: 'miracidium',
      size: 'about 0.13 mm',
      mag: '×400',
      where: 'Water: canals, ponds, paddy fields',
      time: 'Must find a snail within about a day',
      what: 'In warm water and light, the lid opens and a miracidium swims out, covered in beating hairs (cilia). It cannot feed. Using its eye spots it searches for a Lymnaea snail and bores into it with its pointed front (apical papilla).',
    },
    {
      id: 'snail',
      n: 4,
      name: 'Inside the snail: multiplication',
      short: 'In the snail',
      habitat: 'snail',
      angle: 120,
      anchor: 'snailBank',
      model: 'snail',
      size: 'snail 1–2 cm',
      mag: '×4',
      where: 'Lymnaea water snail (intermediate host)',
      time: 'About 6–8 weeks or more (faster when warm)',
      what: 'Inside the snail the miracidium becomes a sporocyst, which makes rediae; the rediae make cercariae. One miracidium gives HUNDREDS of cercariae — the snail is where the fluke multiplies.',
      field: 'Lymnaea snails have a right-handed shell with a large ear-shaped opening and flat triangular tentacles. They live in slow, shallow water: canal edges, paddy fields, ponds, leaking troughs and taps.',
    },
    {
      id: 'cercaria',
      n: 5,
      name: 'Cercariae leave the snail',
      short: 'Cercaria',
      habitat: 'water',
      angle: 86,
      anchor: 'canal',
      model: 'cercaria',
      size: 'body about 0.3 mm, tail longer',
      mag: '×200',
      where: 'Water',
      time: 'Swim for a few hours',
      what: 'Cercariae swim out of the snail with a long, simple tail. Each has an oral sucker, a ventral sucker and glands full of cyst-making material.',
    },
    {
      id: 'metacercaria',
      n: 6,
      name: 'Metacercaria: the infective cyst',
      short: 'Metacercaria',
      habitat: 'pasture',
      angle: 50,
      anchor: 'canalEdge',
      model: 'metacercaria',
      size: 'about 0.2–0.25 mm',
      mag: '×150',
      where: 'Grass, water plants, paddy straw at the water’s edge',
      time: 'Survive months if moist; killed by drying and strong sun',
      what: 'The cercaria sticks to grass or a water plant near the water surface, drops its tail and covers itself in a tough wall: the METACERCARIA. This is the only stage that infects the animal.',
      field:
        'F. gigantica cysts are common on water plants, grass cut from canal banks and straw from waterlogged paddy fields. Cutting fodder from higher ground and sun-drying straw well lowers the risk.',
      infective: true,
    },
    {
      id: 'excyst',
      n: 7,
      name: 'Swallowed: the young fluke comes out',
      short: 'Young fluke',
      habitat: 'host',
      angle: 8,
      anchor: 'duodenum',
      model: 'excyst',
      size: 'about 0.2 mm',
      mag: '×120',
      where: 'Small intestine (duodenum)',
      time: 'Within about a day of being eaten',
      what: 'The buffalo eats the cysts with grass or straw. In the small intestine the young fluke breaks out of its cyst (excysts), bores through the intestinal wall into the abdominal cavity and heads for the liver.',
    },
    {
      id: 'juvenile',
      n: 8,
      name: 'Young flukes tunnel through the liver',
      short: 'Migrating fluke',
      habitat: 'host',
      angle: 328,
      anchor: 'liver',
      model: 'flukeJuvenile',
      size: '1–10 mm while migrating',
      mag: '×12',
      where: 'Liver tissue',
      time: 'Many weeks (longer in F. gigantica than in F. hepatica)',
      what: 'They pierce the liver capsule and tunnel through the liver tissue, eating it and causing bleeding tracks. Then they enter the bile ducts and grow into adults. Eggs appear in the dung about 13–16 weeks after infection.',
      field:
        'Many flukes migrating at once = ACUTE fasciolosis: sudden deaths (mainly sheep and goats), anaemia, a swollen painful liver. Most flukicides miss these young flukes — triclabendazole is the common drug that kills them.',
    },
  ],
  scenes: [
    {
      id: 'intro',
      title: 'Two hosts and water',
      text:
        'The tropical liver fluke needs TWO hosts: a grazing animal (here a buffalo) and a small water snail. Each bubble is one stage, magnified. Follow the arrows round the circle — slowly, one stage at a time.',
      lookSec: 12,
    },
    {
      id: 'adult',
      title: 'Adult flukes in the bile ducts',
      stage: 'adult',
      text: 'Inside the liver, adult flukes live in the bile ducts (cut open here). They feed on blood and lay thousands of eggs every day.',
      move: { to: 'egg', text: 'The eggs flow with the bile into the intestine and leave the body in the dung.', via: 'liverToRectum' },
      note: 'Bile ducts thicken and calcify in cattle and buffalo — the “pipe-stem” liver at slaughter.',
    },
    {
      id: 'egg',
      title: 'Eggs in the dung',
      stage: 'egg',
      text: 'Fluke eggs are big, oval and yellow-brown with a lid (operculum). They are not developed yet — in the dung pat they wait. They develop only when they reach water.',
      move: { to: 'miracidium', text: 'Rain, washing or dung thrown into canals and paddy fields carries the eggs into water.' },
      note: 'Fluke eggs show up in a dung sedimentation test — golden brown with a lid.',
    },
    {
      id: 'miracidium',
      title: 'The miracidium swims',
      stage: 'miracidium',
      text: 'After about 2–3 weeks in warm water the lid opens and a miracidium swims out, rowing with thousands of tiny hairs (cilia). It cannot eat — it has about a day to find a snail.',
      move: { to: 'snail', text: 'It swims to a Lymnaea snail and bores in with its pointed front end.' },
    },
    {
      id: 'snail',
      title: 'Multiplying inside the snail',
      stage: 'snail',
      text: 'Inside the snail it becomes a sporocyst, then rediae (the orange sacs), and the rediae make cercariae. One miracidium becomes HUNDREDS of cercariae over 6–8 weeks.',
      move: { to: 'cercaria', text: 'Cercariae burst out of the snail into the water.' },
      lookSec: 13,
      note: 'No snail, no fluke: snail habitats (slow shallow water, wet patches) are where the risk comes from.',
    },
    {
      id: 'cercaria',
      title: 'Cercariae swim',
      stage: 'cercaria',
      text: 'Each cercaria swims with its long tail. It has two suckers and glands full of cyst material.',
      move: { to: 'metacercaria', text: 'It swims to grass, a water plant or straw just at the water surface.' },
    },
    {
      id: 'metacercaria',
      title: 'The infective cyst',
      stage: 'metacercaria',
      text: 'It sticks to the plant, drops its tail and builds a tough wall: a METACERCARIA. This cyst is the ONLY stage that can infect the buffalo. It lasts for months if kept moist, but drying kills it.',
      move: { to: 'excyst', text: 'The buffalo eats the cysts with grass, water plants or wet straw.' },
      lookSec: 13,
      note: 'Fodder cut from canal banks and straw from waterlogged paddy fields are common sources.',
    },
    {
      id: 'excyst',
      title: 'Out of the cyst in the intestine',
      stage: 'excyst',
      text: 'In the small intestine the young fluke breaks out of the cyst and bores straight through the intestinal wall.',
      move: { to: 'juvenile', text: 'It crosses the abdominal cavity, reaches the liver and pierces its capsule.', via: 'gutToLiver' },
    },
    {
      id: 'juvenile',
      title: 'Tunnelling through the liver',
      stage: 'juvenile',
      text: 'For many weeks the young flukes tunnel through the liver, eating it and leaving bleeding tracks. Many at once cause ACUTE fluke disease: sudden death, anaemia, a swollen painful liver.',
      move: { to: 'adult', text: 'Finally they enter the bile ducts and grow into adults.' },
      lookSec: 13,
      note: 'Young flukes are missed by most flukicides; triclabendazole kills them too.',
    },
    {
      id: 'closed',
      title: 'The cycle is closed',
      stage: 'adult',
      hostView: 'liver',
      text: 'About 13–16 weeks after the cysts were eaten, the new adults start laying eggs — and the cycle begins again. In the liver you can see where the flukes live (right side, behind the ribs).',
    },
    {
      id: 'break',
      title: 'Where can we break it?',
      text:
        'Break the cycle at several points: treat the animals (adults AND young flukes), keep dung out of water, control snails and their wet patches, and keep animals and fodder away from snail water. Open “Break the cycle” to see each one.',
      lookSec: 12,
    },
  ],
  controls: [
    {
      id: 'triclabendazole',
      name: 'Triclabendazole',
      targets: ['juvenile', 'adult'],
      how: 'The common flukicide that kills young flukes migrating in the liver as well as adults — the choice in outbreaks of acute fluke.',
      note: 'Check the label for milking animals and withdrawal periods. Overuse has led to resistance in some countries.',
    },
    {
      id: 'adulticide',
      name: 'Flukicide for adult flukes',
      targets: ['adult'],
      how: 'Oxyclozanide, closantel, rafoxanide, nitroxynil, or albendazole at the fluke dose kill adult flukes in the bile ducts, so fewer eggs reach the land. Most do not kill the youngest flukes, so repeat as advised.',
      note: 'Time treatments to your area’s risk season (often after the monsoon and after paddy harvest) as advised by your department.',
    },
    {
      id: 'dung',
      name: 'Keep dung out of water',
      targets: ['egg'],
      how: 'Heap or compost dung before use (the heat kills eggs), and do not let dung or shed washings run into canals, ponds or paddy fields.',
    },
    {
      id: 'snails',
      name: 'Control snails and their water',
      targets: ['miracidium', 'snail', 'cercaria'],
      how: 'Drain wet patches, repair leaking troughs, taps and channels, fence off snail habitats. Ducks eat snails. Molluscicides only with expert advice — they harm fish and other life.',
    },
    {
      id: 'fodder',
      name: 'Safe grazing and fodder',
      targets: ['metacercaria'],
      how: 'Do not graze along canal banks and wet low ground; cut fodder from higher ground; sun-dry paddy straw well; give clean trough water instead of pond water.',
    },
  ],
  signs: [
    'Chronic (most common in buffalo and cattle): anaemia, pale mucous membranes, bottle jaw, weight loss, rough coat, less milk, poor fertility.',
    'Acute (heavy recent infection, mainly sheep and goats): sudden death, weakness, a swollen painful liver, severe anaemia.',
    'At post-mortem: flukes in thickened (in cattle often calcified) bile ducts; migration tracks and bleeding in the liver in acute cases.',
  ],
  diagnosis: [
    'Dung sedimentation test for fluke eggs (golden yellow-brown, with a lid) — positive only once flukes are adult.',
    'Coproantigen or blood antibody tests where available; raised liver enzymes (GGT) with bile duct damage.',
    'Post-mortem of a dead or slaughtered animal from the herd.',
  ],
  treatment: [
    'Triclabendazole for young + adult flukes; oxyclozanide, closantel, rafoxanide, nitroxynil or albendazole (fluke dose) for adults. Follow the label dose and withdrawal periods.',
    'Supportive care for severe anaemia; good feeding during recovery.',
  ],
  season: 'Risk rises with water: monsoon and post-monsoon months, irrigated paddy areas and canal banks. Infection picked up in the rains shows as disease months later.',
  quiz: [
    {
      q: 'Which stage of the liver fluke infects the buffalo?',
      options: ['Egg in the dung', 'Miracidium in water', 'Metacercaria (cyst) on grass or straw', 'Cercaria in the snail'],
      answer: 2,
      why: 'Only the metacercaria — the cyst on grass, water plants or straw — is infective when swallowed.',
    },
    {
      q: 'What is the intermediate host of Fasciola gigantica?',
      options: ['Hyalomma tick', 'Lymnaea water snail', 'Earthworm', 'Mosquito'],
      answer: 1,
      why: 'The fluke multiplies inside Lymnaea water snails — which is why fluke follows water.',
    },
    {
      q: 'Sudden deaths with a swollen liver in sheep near a canal. Which drug also kills the YOUNG migrating flukes?',
      options: ['Oxyclozanide', 'Albendazole', 'Triclabendazole', 'Ivermectin'],
      answer: 2,
      why: 'Triclabendazole acts on early immature flukes as well as adults; most others act mainly on adults. Ivermectin does not kill flukes.',
    },
    {
      q: 'In a dung sedimentation test, a fluke egg looks…',
      options: ['Clear with 16–32 cells inside', 'Golden yellow-brown with a lid (operculum)', 'Round with a thick spiny shell', 'Barrel-shaped with plugs at both ends'],
      answer: 1,
      why: 'Fasciola eggs are bile-stained yellow-brown and operculate. Clear eggs with visible cells point to amphistomes.',
    },
    {
      q: 'Why does sun-drying paddy straw before feeding help?',
      options: ['It kills the snails', 'Drying kills the metacercariae (cysts) on the straw', 'It removes the eggs', 'It makes the flukes drug-sensitive'],
      answer: 1,
      why: 'Metacercariae survive for months when moist but die when they dry out.',
    },
  ],
  facts: {
    infected: 'Eats cysts (metacercariae) on grass, water plants, wet straw',
    middle: 'Lymnaea water snail',
    site: 'Liver: tunnels in tissue, then bile ducts',
    prepatent: 'About 13–16 weeks',
    key: 'Anaemia, bottle jaw, weight loss, low milk; sudden deaths in acute cases',
    diagnosis: 'Dung sedimentation (yellow-brown lidded eggs); post-mortem',
    drugs: 'Triclabendazole (young + adult); oxyclozanide, closantel and others (adults)',
    control: 'Strategic flukicide, keep dung out of water, snail control, safe grazing and fodder',
  },
};

// ======================================================================================
// Tropical theileriosis
// ======================================================================================

const THEILERIA: Parasite = {
  id: 'theileria',
  name: 'Theileria',
  latin: 'Theileria annulata',
  disease: 'Tropical theileriosis',
  group: 'Protozoan (blood parasite)',
  host: 'cow',
  hostLabel: 'Crossbred cow',
  hosts: 'Cattle — crossbred and exotic cattle suffer most; indigenous cattle and buffalo usually milder and often become carriers.',
  needs: 'Needs a Hyalomma tick (mainly Hyalomma anatolicum) — it multiplies in the cow’s white and red blood cells and in the tick.',
  stages: [
    {
      id: 'tickFeeds',
      n: 1,
      name: 'Infected tick feeds and injects sporozoites',
      short: 'Sporozoites',
      habitat: 'tick',
      angle: 95,
      anchor: 'udder',
      model: 'tick',
      size: 'adult tick 4–6 mm (unfed)',
      mag: '×8',
      where: 'Tick attached to the skin (udder, perineum, inner thighs, tail base)',
      time: 'Sporozoites are ready only after the tick has fed for about 2–4 days',
      what: 'An infected Hyalomma tick attaches with its long mouthparts. Feeding warms it and the parasites in its salivary glands mature into sporozoites, which are injected with the saliva.',
      field: 'Hyalomma ticks: long mouthparts, pale-banded legs, eyes. Removing ticks early — within the first 2 days — lowers the chance of infection.',
      infective: true,
    },
    {
      id: 'sporozoite',
      n: 2,
      name: 'Sporozoites enter white cells',
      short: 'Sporozoite',
      habitat: 'blood',
      angle: 136,
      anchor: 'prefemoral',
      model: 'sporozoite',
      size: 'about 1–2 µm',
      mag: '×5000',
      where: 'White cells (macrophages, B-lymphocytes) near the bite and in the local lymph node',
      time: 'Within hours to days',
      what: 'Sporozoites enter white blood cells — macrophages and B-lymphocytes — near the bite and in the nearest lymph node.',
    },
    {
      id: 'schizont',
      n: 3,
      name: 'Schizonts (Koch’s blue bodies) — infected cells multiply',
      short: 'Schizont',
      habitat: 'blood',
      angle: 178,
      anchor: 'prescapular',
      model: 'schizont',
      size: 'cell about 15–20 µm',
      mag: '×3000',
      where: 'Lymph nodes, spleen, then all over the body',
      time: 'Incubation about 1–3 weeks; schizonts in node smears from early fever',
      what: 'Inside the white cell the parasite grows into a schizont — Koch’s blue body. It makes the cell divide again and again, and BOTH daughter cells carry the parasite. Infected cells fill the lymph nodes and spread through the body.',
      field: 'First signs: high fever (40.5–42 °C) and swollen prescapular and prefemoral lymph nodes. A lymph node biopsy smear (Giemsa) shows Koch’s blue bodies — the earliest diagnosis.',
    },
    {
      id: 'merozoite',
      n: 4,
      name: 'Merozoites released',
      short: 'Merozoite',
      habitat: 'blood',
      angle: 214,
      anchor: 'prescapular',
      model: 'merozoite',
      size: 'about 1 µm',
      mag: '×5000',
      where: 'Lymph nodes into the blood',
      time: 'From about the second week of illness',
      what: 'Some schizonts change into microschizonts. Their cells burst and release many tiny merozoites into the blood.',
    },
    {
      id: 'piroplasm',
      n: 5,
      name: 'Piroplasms in red blood cells',
      short: 'Piroplasm',
      habitat: 'blood',
      angle: 250,
      anchor: 'jugular',
      model: 'piroplasm',
      size: 'about 0.5–2 µm',
      mag: '×3000',
      where: 'Red blood cells',
      time: 'Can stay in red cells for months or years in recovered (carrier) animals',
      what: 'Merozoites enter red blood cells and become piroplasms — small round or oval “signet rings”, commas and rods. Red cells are destroyed: anaemia and jaundice follow.',
      field:
        'A thin blood smear (Giemsa) shows piroplasms. Recovered animals and buffalo often stay carriers — a hidden source of infection for ticks. Severe cases: breathing difficulty (lung oedema), bloody diarrhoea, death.',
    },
    {
      id: 'tickIngests',
      n: 6,
      name: 'A young tick sucks infected blood',
      short: 'Infected blood',
      habitat: 'tick',
      angle: 286,
      anchor: 'perineum',
      model: 'tickNymph',
      size: 'nymph 1–2 mm',
      mag: '×15',
      where: 'Larva or nymph feeding on a sick or carrier animal',
      time: 'Feeds for several days',
      what: 'A larva or nymph tick feeding on a sick or carrier animal sucks up red cells containing piroplasms.',
    },
    {
      id: 'gamete',
      n: 7,
      name: 'Gametes in the tick’s gut',
      short: 'Gametes',
      habitat: 'tick',
      angle: 322,
      anchor: 'perineum',
      model: 'rayBodies',
      size: 'about 5–10 µm',
      mag: '×2000',
      where: 'Tick gut',
      time: 'Days',
      what: 'In the tick’s gut the piroplasms become gametes — spiky “ray bodies”. Gametes fuse to form a zygote: this is the sexual stage, so it happens in the tick.',
    },
    {
      id: 'kinete',
      n: 8,
      name: 'Kinete moves to the salivary glands as the tick moults',
      short: 'Kinete',
      habitat: 'shed',
      angle: 356,
      anchor: 'wall',
      model: 'kinete',
      size: 'kinete about 15 µm; tick 2–5 mm',
      mag: '×12',
      where: 'Inside the tick, hiding in cracks of shed walls and floors',
      time: 'During the moult (weeks)',
      what: 'The engorged tick drops off and moults in a crack of the shed wall or floor. Meanwhile the zygote becomes a moving kinete that travels from the gut to the salivary glands. The parasite passes from stage to stage of the tick (transstadial) — NOT through the tick’s eggs.',
      field: 'Hyalomma anatolicum is a “shed tick”: it hides in cracks and crevices of cattle-shed walls, floors and mangers. Plastering cracks and treating the shed reduces it a lot.',
    },
    {
      id: 'sporoblast',
      n: 9,
      name: 'Waiting in the salivary glands',
      short: 'Sporoblast',
      habitat: 'tick',
      angle: 30,
      anchor: 'udder',
      model: 'salivary',
      size: 'gland acinus about 0.1 mm',
      mag: '×300',
      where: 'Salivary glands of the moulted tick (nymph or adult)',
      time: 'Waits until the tick feeds again',
      what: 'In a salivary gland cell the kinete becomes a sporoblast and waits. When the moulted tick attaches and feeds, it releases thousands of sporozoites — back to the start.',
    },
  ],
  scenes: [
    {
      id: 'intro',
      title: 'A cow, a tick and blood cells',
      text:
        'Theileria annulata lives in TWO hosts: cattle and the Hyalomma tick. In the cow it multiplies first in white cells, then in red cells; in the tick it has its sexual stage. Each bubble is one stage, magnified.',
      lookSec: 12,
    },
    {
      id: 'tickFeeds',
      title: 'An infected tick feeds',
      stage: 'tickFeeds',
      text: 'An infected Hyalomma tick attaches — often on the udder, perineum or inner thighs — and feeds. Only after about 2–4 days of feeding are the sporozoites in its saliva ready to infect.',
      move: { to: 'sporozoite', text: 'Sporozoites enter the skin with the saliva and reach white cells and the nearest lymph node.', via: 'biteToNode' },
      lookSec: 13,
      note: 'Daily tick checks and early removal stop many infections.',
    },
    {
      id: 'sporozoite',
      title: 'Into the white cells',
      stage: 'sporozoite',
      text: 'The tiny sporozoites (pink) enter white cells — macrophages and B-lymphocytes.',
      move: { to: 'schizont', text: 'Inside the white cell, each parasite grows.' },
    },
    {
      id: 'schizont',
      title: 'Koch’s blue bodies',
      stage: 'schizont',
      text: 'The parasite becomes a schizont (Koch’s blue body) and makes the white cell divide — both daughter cells are infected. The lymph nodes fill with infected cells and swell; high fever starts.',
      move: { to: 'merozoite', text: 'Infected cells spread through the lymph nodes, spleen, liver and lungs.' },
      lookSec: 13,
      note: 'Fever + swollen prescapular / prefemoral nodes in a crossbred cow in summer: think theileriosis. Node biopsy smear shows the schizonts.',
    },
    {
      id: 'nodes',
      title: 'Swollen lymph nodes',
      stage: 'schizont',
      hostView: 'prescapular',
      text: 'In the cow you can feel it: the prescapular lymph node (in front of the shoulder) and the prefemoral node (in the flank, in front of the thigh) are swollen.',
    },
    {
      id: 'merozoite',
      title: 'Merozoites burst out',
      stage: 'merozoite',
      text: 'Some schizonts become microschizonts; their cells burst and release many tiny merozoites.',
      move: { to: 'piroplasm', text: 'Merozoites travel in the blood and enter red blood cells.', via: 'nodeToBlood' },
    },
    {
      id: 'piroplasm',
      title: 'Piroplasms in red cells',
      stage: 'piroplasm',
      text: 'In red cells they become piroplasms: small rings (“signet rings”), commas and rods. Red cells are destroyed — anaemia, pale then yellow mucous membranes.',
      move: { to: 'tickIngests', text: 'A young tick feeding on this cow — or on a recovered carrier — sucks up the infected red cells.' },
      lookSec: 13,
      note: 'Recovered cattle and buffalo can carry piroplasms for a long time without signs.',
    },
    {
      id: 'tickIngests',
      title: 'The tick takes up the parasite',
      stage: 'tickIngests',
      text: 'A larva or nymph tick fills itself with blood for several days — and with it, red cells carrying piroplasms.',
      move: { to: 'gamete', text: 'The blood meal reaches the tick’s gut.' },
    },
    {
      id: 'gamete',
      title: 'Gametes in the tick gut',
      stage: 'gamete',
      text: 'In the gut the piroplasms become spiky gametes (“ray bodies”). Two gametes fuse into a zygote — the sexual stage happens in the tick.',
      move: { to: 'kinete', text: 'The full tick drops off the cow.' },
    },
    {
      id: 'kinete',
      title: 'Moulting in the shed wall',
      stage: 'kinete',
      text: 'The tick hides in a crack in the shed wall or floor and moults to the next stage. Inside it, the zygote becomes a moving kinete that swims to the salivary glands.',
      move: { to: 'sporoblast', text: 'The kinete enters a salivary gland cell.' },
      lookSec: 13,
      note: 'Plaster cracks in walls, floors and mangers: Hyalomma anatolicum lives in them.',
    },
    {
      id: 'sporoblast',
      title: 'Waiting to be injected',
      stage: 'sporoblast',
      text: 'In the salivary gland it becomes a sporoblast and waits. When the moulted tick climbs onto a cow and feeds, thousands of sporozoites are formed.',
      move: { to: 'tickFeeds', text: 'The moulted tick attaches to a cow — the cycle starts again.' },
    },
    {
      id: 'break',
      title: 'Where can we break it?',
      text:
        'Break it with tick control on the animal, sealing cracks in the shed, early treatment of sick cows (buparvaquone) and vaccinating crossbred cattle. Open “Break the cycle” to see each one.',
      lookSec: 12,
    },
  ],
  controls: [
    {
      id: 'acaricide',
      name: 'Tick control on the animal',
      targets: ['tickFeeds', 'tickIngests'],
      how: 'Acaricide spray or pour-on at the interval on the label, covering the udder, perineum, inner thighs and tail base. Rotate acaricide groups to slow resistance. Treat carrier animals and buffalo in the same shed too.',
    },
    {
      id: 'early',
      name: 'Daily tick checks',
      targets: ['tickFeeds'],
      how: 'Sporozoites need 2–4 days of feeding to mature, so finding and removing ticks daily prevents many infections.',
    },
    {
      id: 'shed',
      name: 'Seal cracks in the shed',
      targets: ['kinete'],
      how: 'Hyalomma anatolicum moults and hides in cracks of walls, floors and mangers. Plaster and fill cracks, treat the walls, keep the shed clean and dry.',
    },
    {
      id: 'vaccine',
      name: 'Vaccinate crossbred cattle',
      targets: ['sporozoite', 'schizont'],
      how: 'A live schizont cell-culture vaccine (in India: Rakshavac-T) protects crossbred and exotic cattle against the schizont stage. Use as advised by your department.',
    },
    {
      id: 'buparvaquone',
      name: 'Treat early: buparvaquone',
      targets: ['schizont', 'merozoite', 'piroplasm'],
      how: 'Buparvaquone kills schizonts and piroplasms. Treat at the first fever and node swelling; late cases with lung oedema often die. Supportive care: fluids, haematinics, blood transfusion in severe anaemia.',
    },
  ],
  signs: [
    'High fever (40.5–42 °C), dullness, loss of appetite, drop in milk.',
    'Swollen superficial lymph nodes (prescapular, prefemoral), watery eyes and nose.',
    'Anaemia, then jaundice; small bleeds on mucous membranes; fast breathing with lung oedema; bloody diarrhoea late. Crossbred and exotic cattle can die.',
  ],
  diagnosis: [
    'Lymph node biopsy smear (Giemsa): Koch’s blue bodies (schizonts) in lymphocytes — early.',
    'Thin blood smear (Giemsa): piroplasms in red cells (rings, commas, rods).',
    'PCR in labs; finding Hyalomma ticks and the season support the diagnosis.',
  ],
  treatment: [
    'Buparvaquone is the drug of choice — give early. Follow the label dose and milk/meat withdrawal.',
    'Supportive: fluids, anti-fever, haematinics; blood transfusion for severe anaemia.',
  ],
  season: 'Summer and monsoon months, when Hyalomma ticks are most active. Crossbred and exotic cattle in sheds with cracked walls are most at risk.',
  quiz: [
    {
      q: 'Which tick mainly transmits Theileria annulata in India?',
      options: ['Rhipicephalus (Boophilus) microplus', 'Hyalomma anatolicum', 'Haemaphysalis', 'Argas (fowl tick)'],
      answer: 1,
      why: 'Hyalomma anatolicum is the main vector of tropical theileriosis.',
    },
    {
      q: 'Which test gives the EARLIEST diagnosis?',
      options: ['Blood smear for piroplasms', 'Lymph node biopsy smear for Koch’s blue bodies', 'Dung examination', 'Milk test'],
      answer: 1,
      why: 'Schizonts appear in the lymph nodes before piroplasms appear in the blood.',
    },
    {
      q: 'Why does removing ticks in the first 2 days help?',
      options: ['Ticks die anyway', 'Sporozoites mature only after 2–4 days of feeding', 'Theileria lives only in tick eggs', 'The cow is immune for 2 days'],
      answer: 1,
      why: 'The tick must feed for a few days before the sporozoites in its saliva are infective.',
    },
    {
      q: 'Theileria passes in the tick…',
      options: ['Through the tick’s eggs to the next generation (transovarial)', 'From one stage to the next (transstadial)', 'Only in adult males', 'It does not enter the tick'],
      answer: 1,
      why: 'Larva or nymph picks it up and the next stage (nymph or adult) transmits it — transstadial, not through eggs.',
    },
    {
      q: 'The drug of choice for tropical theileriosis is…',
      options: ['Ivermectin', 'Buparvaquone', 'Triclabendazole', 'Albendazole'],
      answer: 1,
      why: 'Buparvaquone kills schizonts and piroplasms. Ivermectin, triclabendazole and albendazole do not treat theileriosis.',
    },
    {
      q: 'Where does Hyalomma anatolicum hide and moult?',
      options: ['In pasture grass', 'In cracks of shed walls, floors and mangers', 'In ponds', 'Only on the animal'],
      answer: 1,
      why: 'It is a shed (domestic) tick — sealing cracks removes its hiding places.',
    },
  ],
  facts: {
    infected: 'Bite of an infected Hyalomma tick (sporozoites in saliva)',
    middle: 'Hyalomma tick (vector; sexual stage)',
    site: 'White cells (lymph nodes), then red blood cells',
    prepatent: 'Incubation about 1–3 weeks',
    key: 'High fever, swollen lymph nodes, anaemia, jaundice, breathing difficulty',
    diagnosis: 'Lymph node smear (Koch’s blue bodies); blood smear (piroplasms)',
    drugs: 'Buparvaquone',
    control: 'Tick control, seal shed cracks, schizont vaccine, early treatment',
  },
};

// ======================================================================================
// Barber's pole worm
// ======================================================================================

const HAEMONCHUS: Parasite = {
  id: 'haemonchus',
  name: 'Barber’s pole worm',
  latin: 'Haemonchus contortus',
  disease: 'Haemonchosis',
  group: 'Nematode (roundworm)',
  host: 'sheep',
  hostLabel: 'Sheep',
  hosts: 'Sheep and goats (cattle have a close relative, H. placei).',
  needs: 'Direct life cycle — no intermediate host. Eggs develop to infective larvae on the pasture in warm, wet weather.',
  stages: [
    {
      id: 'adult',
      n: 1,
      name: 'Adult worms suck blood in the abomasum',
      short: 'Adult worm',
      habitat: 'host',
      angle: 268,
      anchor: 'abomasum',
      model: 'wormAdult',
      size: 'male 1–2 cm, female 2–3 cm',
      mag: '×6',
      where: 'Abomasum (true stomach)',
      time: 'Live for a few months',
      what: 'Adults attach to the abomasal lining and suck blood with a small lancet. The female looks like a barber’s pole: her red, blood-filled gut twists around her white ovaries. Each female lays 5,000–10,000 eggs a day.',
      field:
        'Each worm takes about 0.05 ml of blood a day — a few thousand worms can kill a sheep or goat. Signs: anaemia (pale eyelids), bottle jaw, weakness, sudden death. Usually NO diarrhoea.',
    },
    {
      id: 'egg',
      n: 2,
      name: 'Eggs in the dung pellets',
      short: 'Egg',
      habitat: 'dung',
      angle: 205,
      anchor: 'dung',
      model: 'strongyleEgg',
      size: 'about 0.07–0.085 mm',
      mag: '×500',
      where: 'Dung pellets on the pasture or in the pen',
      time: 'Hatch in about a day when warm and moist',
      what: 'Thin-shelled oval eggs containing a ball of 16–32 cells (morula) — the typical “strongyle-type” egg.',
      field: 'McMaster count gives eggs per gram (EPG). Strongyle eggs look alike, so a larval culture tells Haemonchus from the others — but severe anaemia in sheep and goats points strongly to it.',
    },
    {
      id: 'L1',
      n: 3,
      name: 'L1 larva hatches',
      short: 'L1',
      habitat: 'dung',
      angle: 168,
      anchor: 'dung',
      model: 'larvaL1',
      size: 'about 0.3 mm',
      mag: '×300',
      where: 'Inside the dung pellet',
      time: 'About 1 day',
      what: 'The first-stage larva (L1) hatches inside the moist dung pellet and feeds on bacteria.',
    },
    {
      id: 'L2',
      n: 4,
      name: 'L2 larva feeds and grows',
      short: 'L2',
      habitat: 'dung',
      angle: 134,
      anchor: 'dung',
      model: 'larvaL2',
      size: 'about 0.4–0.5 mm',
      mag: '×250',
      where: 'Inside the dung pellet',
      time: '1–2 days',
      what: 'L1 moults to L2, which also feeds on bacteria in the dung.',
    },
    {
      id: 'L3',
      n: 5,
      name: 'L3: the infective larva',
      short: 'L3',
      habitat: 'dung',
      angle: 102,
      anchor: 'dung',
      model: 'larvaL3',
      size: 'about 0.7 mm',
      mag: '×200',
      where: 'Dung pellet',
      time: 'As little as 4–6 days after the egg was passed (warm, wet weather)',
      what: 'L2 moults to L3 but keeps its old skin as a SHEATH. The sheathed L3 cannot feed — it lives on stored food — but it is protected. This is the INFECTIVE stage.',
      infective: true,
    },
    {
      id: 'pasture',
      n: 6,
      name: 'L3 climbs onto the grass',
      short: 'L3 on grass',
      habitat: 'pasture',
      angle: 68,
      anchor: 'pasture',
      model: 'grassL3',
      size: 'about 0.7 mm',
      mag: '×40',
      where: 'Grass near the dung, in films of water (dew, rain)',
      time: 'Weeks to a few months; die faster in hot, dry sun',
      what: 'L3 move out of the pellet onto grass in films of water — dew and rain. Most stay in the lowest 5 cm of the grass and are most active in the early morning and evening.',
      field: 'Short, overgrazed, wet pasture = many larvae eaten. Graze later in the morning after the dew dries, avoid very short grass, do not overstock.',
      infective: true,
    },
    {
      id: 'exsheath',
      n: 7,
      name: 'Swallowed: the L3 drops its sheath',
      short: 'Swallowed L3',
      habitat: 'host',
      angle: 24,
      anchor: 'rumen',
      model: 'exsheath',
      size: 'about 0.7 mm',
      mag: '×150',
      where: 'Rumen',
      time: 'Hours',
      what: 'The sheep eats L3 with the grass. In the rumen the larva leaves its sheath (exsheaths) and passes on to the abomasum.',
    },
    {
      id: 'L4',
      n: 8,
      name: 'L4 in the stomach glands',
      short: 'L4',
      habitat: 'host',
      angle: 336,
      anchor: 'abomasum',
      model: 'larvaL4',
      size: 'about 1–2 mm',
      mag: '×40',
      where: 'Gastric glands of the abomasum',
      time: 'Eggs in dung about 18–21 days after infection (prepatent period)',
      what: 'L3 enter the stomach glands and moult to L4, which starts sucking blood; then L5 and adults. In dry or cold seasons L4 can stay ARRESTED in the lining for months (hypobiosis) and wake up with the rains or around lambing and kidding.',
      field: 'Arrested larvae and the drop in immunity around lambing/kidding (peri-parturient rise) put many eggs on the pasture just when lambs and kids start grazing.',
    },
  ],
  scenes: [
    {
      id: 'intro',
      title: 'A simple, fast cycle',
      text:
        'The barber’s pole worm needs no other host: eggs in the dung become infective larvae on the grass in under a week in warm, wet weather. That is why it explodes in the monsoon. Each bubble is one stage, magnified.',
      lookSec: 12,
    },
    {
      id: 'adult',
      title: 'Blood-sucking adults',
      stage: 'adult',
      text: 'In the abomasum, adult worms attach to the lining and suck blood. The female is the “barber’s pole”: red blood-filled gut twisted around white ovaries.',
      move: { to: 'egg', text: 'Each female lays 5,000–10,000 eggs a day; they pass out in the dung pellets.', via: 'abomasumToRectum' },
      lookSec: 13,
    },
    {
      id: 'egg',
      title: 'Eggs in the pellets',
      stage: 'egg',
      text: 'Each egg has a thin shell and a ball of 16–32 cells — a typical strongyle-type egg.',
      move: { to: 'L1', text: 'Within about a day, in warm moist dung, a larva forms.' },
      note: 'EPG (McMaster) tells you how many eggs — useful before and after drenching.',
    },
    {
      id: 'L1',
      title: 'L1 hatches',
      stage: 'L1',
      text: 'The first larva (L1) hatches inside the pellet and feeds on bacteria.',
      move: { to: 'L2', text: 'It grows and moults (sheds its skin).' },
    },
    {
      id: 'L2',
      title: 'L2 feeds',
      stage: 'L2',
      text: 'The L2 also feeds on bacteria and grows.',
      move: { to: 'L3', text: 'It moults again — but this time keeps its old skin.' },
    },
    {
      id: 'L3',
      title: 'The infective L3',
      stage: 'L3',
      text: 'The L3 keeps the L2 skin as a sheath. It cannot eat — it lives on stored food — but the sheath protects it. This is the INFECTIVE larva, ready in as little as 4–6 days.',
      move: { to: 'pasture', text: 'With rain or dew it wriggles out of the pellet onto the grass.' },
      lookSec: 13,
    },
    {
      id: 'pasture',
      title: 'Climbing the wet grass',
      stage: 'pasture',
      text: 'L3 move up the grass in films of water — dew drops and rain. Most stay in the lowest 5 cm; they are most active in the early morning and evening.',
      move: { to: 'exsheath', text: 'The grazing sheep eats them with the grass.' },
      lookSec: 13,
      note: 'Short, wet, overgrazed grass is the most dangerous.',
    },
    {
      id: 'exsheath',
      title: 'Out of the sheath in the rumen',
      stage: 'exsheath',
      text: 'In the rumen the larva leaves its sheath.',
      move: { to: 'L4', text: 'It moves on into the abomasum.', via: 'rumenToAbomasum' },
    },
    {
      id: 'L4',
      title: 'In the stomach glands',
      stage: 'L4',
      text: 'It enters the stomach glands, moults to L4 and starts sucking blood, then becomes an adult. Eggs appear in about 3 weeks. In dry seasons L4 can wait in the lining for months (hypobiosis).',
      move: { to: 'adult', text: 'L4 → L5 → adult worms on the abomasal lining.' },
      lookSec: 13,
    },
    {
      id: 'signs',
      title: 'What you see in the sheep',
      stage: 'adult',
      hostView: 'jaw',
      text: 'Blood loss shows as pale eyelids (check with the FAMACHA card) and bottle jaw — a soft swelling under the jaw. Weak sheep lag behind and may die suddenly. Usually there is no diarrhoea.',
      lookSec: 13,
    },
    {
      id: 'break',
      title: 'Where can we break it?',
      text:
        'Break it with targeted drenching (FAMACHA), rotating to rested pasture, avoiding wet, short grass, and keeping pens clean and dry. Open “Break the cycle” to see each one.',
      lookSec: 12,
    },
  ],
  controls: [
    {
      id: 'drench',
      name: 'Anthelmintic (drench)',
      targets: ['adult', 'L4'],
      how: 'Benzimidazoles (albendazole, fenbendazole), levamisole, the ivermectin group, closantel (narrow-spectrum, acts on Haemonchus). Dose by real body weight — never under-dose — and check it worked with an EPG count before and after.',
      note: 'Resistance is common in sheep and goats; change the drug group if a drench fails.',
    },
    {
      id: 'famacha',
      name: 'Treat only anaemic animals (FAMACHA)',
      targets: ['adult'],
      how: 'Check the lower eyelid colour against the FAMACHA card; drench animals scoring 4–5 (sometimes 3). Leaving healthy animals untreated keeps drug-sensitive worms on the farm and slows resistance.',
    },
    {
      id: 'pens',
      name: 'Clean, dry pens',
      targets: ['egg', 'L1', 'L2'],
      how: 'Remove dung from night pens often and keep them dry — eggs and young larvae need moisture.',
    },
    {
      id: 'grazing',
      name: 'Rested pasture and later grazing',
      targets: ['L3', 'pasture'],
      how: 'Rotate to pasture rested for several weeks; graze after the dew dries; avoid very short grass and do not overstock. Good protein feeding helps sheep resist worms.',
    },
  ],
  signs: [
    'Anaemia: pale eyelids and gums (FAMACHA 4–5), weakness, lagging behind the flock.',
    'Bottle jaw (soft swelling under the jaw) from protein loss; weight loss; wool or hair loss.',
    'Sudden death in heavy infections, especially lambs and kids in the monsoon. Usually NO diarrhoea.',
  ],
  diagnosis: [
    'FAMACHA eye score in the field.',
    'McMaster faecal egg count (EPG); larval culture to confirm Haemonchus.',
    'Post-mortem: worms in the abomasum, watery pale blood, pale carcass.',
  ],
  treatment: [
    'Drench with an effective group (benzimidazole, levamisole, ivermectin group, closantel). Dose by weight; check with EPG before and after.',
    'Move treated animals to safer pasture; extra protein feeding helps recovery.',
  ],
  season: 'Monsoon and post-monsoon: warm and wet weather turns eggs into infective larvae in under a week. Arrested larvae and the peri-parturient rise add more eggs at lambing/kidding.',
  quiz: [
    {
      q: 'Why is it called the “barber’s pole” worm?',
      options: ['It has red and white rings on its skin', 'Its red blood-filled gut twists around its white ovaries', 'It lives in barbers’ shops', 'It is striped only when dead'],
      answer: 1,
      why: 'In the female, the blood-filled gut winds around the white ovaries — like a barber’s pole.',
    },
    {
      q: 'The main sign of haemonchosis is…',
      options: ['Profuse diarrhoea', 'Anaemia (pale eyelids) and bottle jaw', 'Itching and hair loss only', 'Lameness'],
      answer: 1,
      why: 'It is a blood-sucker: anaemia and protein loss (bottle jaw). Diarrhoea is uncommon.',
    },
    {
      q: 'Which stage infects the sheep?',
      options: ['Egg', 'L1', 'Sheathed L3 on grass', 'Adult'],
      answer: 2,
      why: 'Only the sheathed L3 on the grass is infective.',
    },
    {
      q: 'How long after infection do eggs appear in the dung (prepatent period)?',
      options: ['2–3 days', 'About 18–21 days', '13–16 weeks', '1 year'],
      answer: 1,
      why: 'Around 3 weeks — a fast cycle, so worm numbers build up quickly in the monsoon.',
    },
    {
      q: 'With FAMACHA, which sheep do you drench?',
      options: ['All, every month', 'Red eyelids (score 1–2)', 'Pale to white eyelids (score 4–5, sometimes 3)', 'Only rams'],
      answer: 2,
      why: 'Treat the anaemic ones; leaving healthy animals untreated slows drug resistance.',
    },
    {
      q: 'Why graze later in the morning?',
      options: ['Grass is sweeter', 'L3 larvae climb the grass in the morning dew', 'Sheep eat less', 'Ticks are fewer'],
      answer: 1,
      why: 'Larvae move up the grass in films of water — once the dew dries, fewer are eaten.',
    },
  ],
  facts: {
    infected: 'Eats sheathed L3 larvae on grass',
    middle: 'None (direct cycle)',
    site: 'Abomasum',
    prepatent: 'About 18–21 days',
    key: 'Anaemia (FAMACHA), bottle jaw, weakness, sudden death; no diarrhoea',
    diagnosis: 'FAMACHA, McMaster EPG, larval culture; post-mortem',
    drugs: 'Benzimidazoles, levamisole, ivermectin group, closantel',
    control: 'Targeted drenching, rested pasture, graze after dew, clean dry pens',
  },
};

export const PARASITES: Record<ParasiteId, Parasite> = { fluke: FLUKE, theileria: THEILERIA, haemonchus: HAEMONCHUS };
export const PARASITE_ORDER: ParasiteId[] = ['fluke', 'theileria', 'haemonchus'];

export const stageOf = (p: Parasite, id: string) => p.stages.find((s) => s.id === id);

/** Habitat colours (ring arrows, bubble rims, chips). */
export const HABITAT: Record<Habitat, { label: string; color: string; bg: string }> = {
  host: { label: 'In the animal', color: '#c0392b', bg: '#fbe6e2' },
  blood: { label: 'In the blood / cells', color: '#a3317a', bg: '#f6eaf6' },
  water: { label: 'In water', color: '#2a78d6', bg: '#e1f0fa' },
  snail: { label: 'In the snail', color: '#2e7d4f', bg: '#e3f1e7' },
  pasture: { label: 'On grass', color: '#5e8f1e', bg: '#ecf5dc' },
  dung: { label: 'In dung', color: '#8d6e63', bg: '#f3ebe1' },
  tick: { label: 'In / on the tick', color: '#a0522d', bg: '#f6ecdf' },
  shed: { label: 'In the shed', color: '#6d5b4b', bg: '#efe9e2' },
};

/** Ring order check: each stage's next stage (the ring closes). */
export function nextStage(p: Parasite, id: string): string {
  const i = p.stages.findIndex((s) => s.id === id);
  return p.stages[(i + 1) % p.stages.length].id;
}
