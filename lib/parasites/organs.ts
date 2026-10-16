// Which parasites live where in cattle/buffalo and sheep/goats, by group.
// For the "Where they live" organ map in the parasite lab. Content: to be reviewed by a vet.

export type GroupId = 'nematode' | 'cestode' | 'trematode' | 'protozoa' | 'arthropod';
export type Species = 'cattle' | 'sheep';
export type OrganId =
  | 'skin'
  | 'nose'
  | 'eye'
  | 'brain'
  | 'oesophagus'
  | 'lungs'
  | 'muscle'
  | 'blood'
  | 'liver'
  | 'pancreas'
  | 'rumen'
  | 'abomasum'
  | 'smallInt'
  | 'largeInt'
  | 'gutVeins'
  | 'peritoneum'
  | 'repro';

export const GROUPS: Record<GroupId, { name: string; common: string; color: string }> = {
  nematode: { name: 'Nematodes', common: 'roundworms', color: '#2a78d6' },
  cestode: { name: 'Cestodes', common: 'tapeworms & their cysts', color: '#d89a00' },
  trematode: { name: 'Trematodes', common: 'flukes', color: '#c0392b' },
  protozoa: { name: 'Protozoa', common: 'single-celled', color: '#8e44ad' },
  arthropod: { name: 'Arthropods', common: 'ticks, mites, lice, flies', color: '#4e7d2e' },
};
export const GROUP_ORDER: GroupId[] = ['nematode', 'cestode', 'trematode', 'protozoa', 'arthropod'];

export const ORGANS: Record<OrganId, { name: string; short: string }> = {
  skin: { name: 'Skin and hair', short: 'Skin' },
  nose: { name: 'Nose and sinuses', short: 'Nose' },
  eye: { name: 'Eye', short: 'Eye' },
  brain: { name: 'Brain', short: 'Brain' },
  oesophagus: { name: 'Oesophagus', short: 'Oesophagus' },
  lungs: { name: 'Lungs and airways', short: 'Lungs' },
  muscle: { name: 'Muscles and heart', short: 'Muscle & heart' },
  blood: { name: 'Blood (red and white cells, plasma)', short: 'Blood' },
  liver: { name: 'Liver and bile ducts', short: 'Liver' },
  pancreas: { name: 'Pancreas', short: 'Pancreas' },
  rumen: { name: 'Rumen and reticulum', short: 'Rumen' },
  abomasum: { name: 'Abomasum (true stomach)', short: 'Abomasum' },
  smallInt: { name: 'Small intestine', short: 'Small intestine' },
  largeInt: { name: 'Large intestine (caecum and colon)', short: 'Large intestine' },
  gutVeins: { name: 'Veins of the gut (mesenteric and portal)', short: 'Gut veins' },
  peritoneum: { name: 'Abdominal cavity (peritoneum, omentum)', short: 'Abdominal cavity' },
  repro: { name: 'Reproductive tract and fetus', short: 'Reproductive tract' },
};
export const ORGAN_ORDER = Object.keys(ORGANS) as OrganId[];

export interface ParasiteEntry {
  name: string;
  group: GroupId;
  organs: OrganId[];
  hosts: Species[];
  /** Stage found there: adult worms, larvae, larval cysts… */
  stage: string;
  /** Disease / what it does / how to recognise it. */
  note: string;
  /** Larval cyst whose adult lives in a dog or person. */
  cystOf?: string;
  zoonotic?: boolean;
}

const BOTH: Species[] = ['cattle', 'sheep'];

export const ENTRIES: ParasiteEntry[] = [
  // ---- nematodes ----
  { name: 'Haemonchus contortus (barber’s pole worm)', group: 'nematode', organs: ['abomasum'], hosts: ['sheep'], stage: 'Adults and L4', note: 'Blood-sucker: anaemia, bottle jaw, sudden deaths. Cattle have H. placei.' },
  { name: 'Haemonchus placei', group: 'nematode', organs: ['abomasum'], hosts: ['cattle'], stage: 'Adults and L4', note: 'Blood-sucking abomasal worm of cattle and buffalo; anaemia in calves.' },
  { name: 'Mecistocirrus digitatus', group: 'nematode', organs: ['abomasum'], hosts: BOTH, stage: 'Adults', note: 'Large blood-sucking worm of cattle and buffalo in Asia; anaemia, weight loss.' },
  { name: 'Trichostrongylus axei', group: 'nematode', organs: ['abomasum'], hosts: BOTH, stage: 'Adults', note: 'Tiny hair-like worm; inflamed abomasal lining, poor growth.' },
  { name: 'Ostertagia', group: 'nematode', organs: ['abomasum'], hosts: BOTH, stage: 'Adults and larvae in glands', note: 'Brown stomach worm; “Moroccan leather” lining. Mainly cooler, hilly areas.' },
  { name: 'Toxocara vitulorum', group: 'nematode', organs: ['smallInt'], hosts: ['cattle'], stage: 'Adults', note: 'Large roundworm of buffalo and cattle CALVES (1–3 months), passed to the calf in milk. Diarrhoea, colic, deaths; eggs thick, pitted shell.' },
  { name: 'Strongyloides papillosus', group: 'nematode', organs: ['smallInt'], hosts: BOTH, stage: 'Adult females', note: 'Young animals; larvae enter through the skin and milk. Diarrhoea. Eggs already contain a larva.' },
  { name: 'Bunostomum (hookworm)', group: 'nematode', organs: ['smallInt'], hosts: BOTH, stage: 'Adults', note: 'Blood-sucking hookworm; larvae can enter through skin (wet bedding). Anaemia, oedema.' },
  { name: 'Cooperia', group: 'nematode', organs: ['smallInt'], hosts: BOTH, stage: 'Adults', note: 'Common in calves; diarrhoea, poor growth.' },
  { name: 'Trichostrongylus colubriformis', group: 'nematode', organs: ['smallInt'], hosts: ['sheep'], stage: 'Adults', note: '“Black scour worm” of sheep and goats: diarrhoea, weight loss.' },
  { name: 'Oesophagostomum (nodular worm)', group: 'nematode', organs: ['largeInt'], hosts: BOTH, stage: 'Adults; larvae in nodules in the gut wall', note: 'Nodules in the colon wall (“pimply gut”); diarrhoea, weight loss.' },
  { name: 'Trichuris (whipworm)', group: 'nematode', organs: ['largeInt'], hosts: BOTH, stage: 'Adults', note: 'In the caecum; lemon-shaped eggs with a plug at each end.' },
  { name: 'Chabertia ovina', group: 'nematode', organs: ['largeInt'], hosts: ['sheep'], stage: 'Adults', note: 'Large-mouthed bowel worm of sheep and goats; mucoid, bloody dung.' },
  { name: 'Dictyocaulus viviparus (lungworm)', group: 'nematode', organs: ['lungs'], hosts: ['cattle'], stage: 'Adults in the bronchi', note: 'Husk: coughing, fast breathing in young cattle. Larvae in dung — Baermann test.' },
  { name: 'Dictyocaulus filaria (lungworm)', group: 'nematode', organs: ['lungs'], hosts: ['sheep'], stage: 'Adults in the bronchi', note: 'Coughing, nasal discharge in sheep and goats. Baermann test.' },
  { name: 'Muellerius capillaris', group: 'nematode', organs: ['lungs'], hosts: ['sheep'], stage: 'Adults in lung tissue', note: 'Small nodules in the lungs; goats more affected. Needs a snail or slug.' },
  { name: 'Gongylonema', group: 'nematode', organs: ['oesophagus'], hosts: BOTH, stage: 'Adults', note: 'Zig-zag worms in the oesophagus lining; usually harmless. Spread by dung beetles.' },
  { name: 'Thelazia (eye worm)', group: 'nematode', organs: ['eye'], hosts: ['cattle'], stage: 'Adults', note: 'In the conjunctival sac: watering, conjunctivitis, keratitis. Spread by face flies.' },
  { name: 'Setaria (abdominal worm)', group: 'nematode', organs: ['peritoneum'], hosts: ['cattle'], stage: 'Adults', note: 'Long white worms free in the abdominal cavity of cattle and buffalo; usually harmless. Spread by mosquitoes; strayed larvae cause paralysis in sheep, goats and horses.' },
  { name: 'Stephanofilaria assamensis', group: 'nematode', organs: ['skin'], hosts: ['cattle'], stage: 'Adults and microfilariae in skin', note: '“Hump sore” of cattle in India: raw, bleeding skin sores. Spread by flies.' },
  // ---- cestodes: adult tapeworms ----
  { name: 'Moniezia expansa / M. benedeni', group: 'cestode', organs: ['smallInt'], hosts: BOTH, stage: 'Adult tapeworms', note: 'Long tapeworms; rice-grain segments in dung. Eggs triangular/square with a pear-shaped apparatus. Intermediate host: pasture (oribatid) mites. Mostly mild; heavy in lambs and calves.' },
  { name: 'Avitellina, Thysaniezia', group: 'cestode', organs: ['smallInt'], hosts: BOTH, stage: 'Adult tapeworms', note: 'Other tapeworms of the small intestine; usually mild.' },
  { name: 'Stilesia hepatica', group: 'cestode', organs: ['liver'], hosts: ['sheep'], stage: 'Adult tapeworms in bile ducts', note: 'Thin tapeworms in the bile ducts of sheep and goats; harmless but livers are condemned.' },
  // ---- cestodes: larval cysts (adults in dogs or people) ----
  { name: 'Hydatid cyst', group: 'cestode', organs: ['liver', 'lungs'], hosts: BOTH, stage: 'Larval cyst (metacestode)', cystOf: 'Echinococcus granulosus of dogs', zoonotic: true, note: 'Fluid-filled cysts in liver and lungs. People get hydatid disease from dog eggs. Never feed raw offal to dogs; deworm dogs.' },
  { name: 'Cysticercus tenuicollis', group: 'cestode', organs: ['peritoneum', 'liver'], hosts: BOTH, stage: 'Larval cyst', cystOf: 'Taenia hydatigena of dogs', note: '“Water balls” hanging from the omentum and liver surface; migration tracks in the liver of lambs and kids.' },
  { name: 'Coenurus cerebralis', group: 'cestode', organs: ['brain'], hosts: ['sheep'], stage: 'Larval cyst', cystOf: 'Taenia multiceps of dogs', note: '“Gid”: a cyst in the brain — circling, head tilt, blindness, soft skull. Sheep and goats.' },
  { name: 'Cysticercus bovis', group: 'cestode', organs: ['muscle'], hosts: ['cattle'], stage: 'Larval cyst', cystOf: 'Taenia saginata of PEOPLE', zoonotic: true, note: '“Beef measles”: small cysts in heart, tongue, jaw muscles. People get the tapeworm from undercooked beef; cattle from human faeces.' },
  { name: 'Cysticercus ovis', group: 'cestode', organs: ['muscle'], hosts: ['sheep'], stage: 'Larval cyst', cystOf: 'Taenia ovis of dogs', note: '“Sheep measles”: cysts in heart and muscles; carcass trimming or condemnation.' },
  // ---- trematodes ----
  { name: 'Fasciola gigantica (liver fluke)', group: 'trematode', organs: ['liver'], hosts: BOTH, stage: 'Young flukes in liver tissue; adults in bile ducts', note: 'Anaemia, bottle jaw, weight loss; sudden deaths in acute cases. Snail intermediate host.' },
  { name: 'Gigantocotyle explanatum', group: 'trematode', organs: ['liver'], hosts: ['cattle'], stage: 'Adults in bile ducts', note: 'An amphistome that lives in the bile ducts of buffalo and cattle in India; thickened ducts.' },
  { name: 'Dicrocoelium (lancet fluke)', group: 'trematode', organs: ['liver'], hosts: BOTH, stage: 'Adults in bile ducts', note: 'Small fluke; needs a land snail and an ant. Mainly hilly areas.' },
  { name: 'Amphistomes (rumen flukes, adults)', group: 'trematode', organs: ['rumen'], hosts: BOTH, stage: 'Adults', note: 'Small pink pear-shaped flukes on the rumen and reticulum lining (Paramphistomum, Cotylophoron, Gastrothylax…). Adults cause little harm.' },
  { name: 'Amphistomes (immature)', group: 'trematode', organs: ['smallInt'], hosts: BOTH, stage: 'Young flukes in the duodenum', note: 'Immature amphistomosis: foul watery diarrhoea, weakness, deaths — young flukes are in the gut wall, so no eggs yet. Look for young flukes in the diarrhoea.' },
  { name: 'Schistosoma spindale / S. indicum', group: 'trematode', organs: ['gutVeins'], hosts: BOTH, stage: 'Adults in veins (male holds female)', note: 'Blood flukes in the mesenteric and portal veins; eggs damage gut and liver. Snail intermediate host. Spindle-shaped eggs without a lid.' },
  { name: 'Schistosoma nasale', group: 'trematode', organs: ['nose'], hosts: ['cattle'], stage: 'Adults in nasal veins', note: '“Snoring disease” of cattle and buffalo in India: nodules in the nose, snoring, discharge.' },
  { name: 'Eurytrema pancreaticum', group: 'trematode', organs: ['pancreas'], hosts: BOTH, stage: 'Adults in pancreatic ducts', note: 'Pancreatic fluke (Asia); heavy infection causes weight loss.' },
  // ---- protozoa ----
  { name: 'Theileria annulata', group: 'protozoa', organs: ['blood'], hosts: ['cattle'], stage: 'Schizonts in white cells, piroplasms in red cells', note: 'Tropical theileriosis: fever, swollen lymph nodes, anaemia. Hyalomma ticks. (Sheep and goats have other Theileria species.)' },
  { name: 'Babesia bigemina', group: 'protozoa', organs: ['blood'], hosts: ['cattle'], stage: 'Pear-shaped pairs in red cells', note: 'Babesiosis: fever, red-brown urine (haemoglobinuria), anaemia, jaundice. Rhipicephalus (Boophilus) ticks — passed through tick eggs.' },
  { name: 'Trypanosoma evansi', group: 'protozoa', organs: ['blood'], hosts: BOTH, stage: 'In plasma (outside cells)', note: 'Surra: fever, anaemia, nervous signs, abortion. Spread by biting flies (Tabanus, Stomoxys).' },
  { name: 'Eimeria (coccidiosis)', group: 'protozoa', organs: ['smallInt', 'largeInt'], hosts: BOTH, stage: 'Inside gut lining cells', note: 'Calves, lambs, kids 3 weeks–6 months: diarrhoea, often bloody with straining. Oocysts in dung (flotation).' },
  { name: 'Cryptosporidium parvum', group: 'protozoa', organs: ['smallInt'], hosts: BOTH, stage: 'On the gut lining', note: 'Watery diarrhoea in calves, lambs and kids under 1 month. Zoonotic. Acid-fast stain of dung.', zoonotic: true },
  { name: 'Sarcocystis', group: 'protozoa', organs: ['muscle'], hosts: BOTH, stage: 'Cysts in muscle', note: 'Cysts in muscle, oesophagus and heart; usually no signs. Dogs and cats are the final hosts.' },
  { name: 'Toxoplasma gondii', group: 'protozoa', organs: ['repro', 'muscle'], hosts: ['sheep'], stage: 'In placenta, fetus and muscle', note: 'Abortion and weak lambs/kids; spotted placenta. Cats spread it. Zoonotic.', zoonotic: true },
  { name: 'Neospora caninum', group: 'protozoa', organs: ['repro'], hosts: ['cattle'], stage: 'In placenta and fetus', note: 'Abortion in cattle; dogs spread it.' },
  { name: 'Tritrichomonas foetus', group: 'protozoa', organs: ['repro'], hosts: ['cattle'], stage: 'In the bull’s sheath and cow’s uterus', note: 'Venereal: early embryonic death, irregular returns to heat, pyometra. Using AI prevents it.' },
  // ---- arthropods ----
  { name: 'Ticks: Rhipicephalus (Boophilus), Hyalomma, Haemaphysalis', group: 'arthropod', organs: ['skin'], hosts: BOTH, stage: 'Larvae, nymphs, adults feeding', note: 'Blood loss, hide damage — and they carry Babesia, Theileria and Anaplasma.' },
  { name: 'Mange mites: Sarcoptes, Psoroptes, Demodex', group: 'arthropod', organs: ['skin'], hosts: BOTH, stage: 'All stages in or on the skin', note: 'Itching, hair loss, crusts. Sarcoptic mange is common in buffalo and goats (zoonotic); Psoroptes causes sheep scab and buffalo mange; Demodex makes nodules. Skin scraping.', zoonotic: true },
  { name: 'Lice: Haematopinus, Linognathus, Bovicola', group: 'arthropod', organs: ['skin'], hosts: BOTH, stage: 'All stages on the hair', note: 'Itching, rubbing, rough coat; sucking lice cause anaemia (buffalo louse H. tuberculatus).' },
  { name: 'Oestrus ovis (nasal bot)', group: 'arthropod', organs: ['nose'], hosts: ['sheep'], stage: 'Fly larvae (bots)', note: 'Larvae in the nose and sinuses: sneezing, thick discharge, head shaking.' },
  { name: 'Hypoderma (warble fly)', group: 'arthropod', organs: ['skin'], hosts: ['cattle'], stage: 'Larvae (warbles) under the skin of the back', note: 'Lumps with breathing holes along the back; hide damage. Mostly hilly regions.' },
];

export function entriesFor(organ: OrganId, species: Species, group?: GroupId | null): ParasiteEntry[] {
  return ENTRIES.filter((e) => e.organs.includes(organ) && e.hosts.includes(species) && (!group || e.group === group));
}

/** How the groups differ — rows of the comparison table. */
export const GROUP_TABLE: Array<{ label: string; values: Record<GroupId, string> }> = [
  {
    label: 'What they are',
    values: {
      nematode: 'Roundworms',
      cestode: 'Tapeworms (adults) and their larval cysts',
      trematode: 'Flukes',
      protozoa: 'Single-celled parasites (microscopic)',
      arthropod: 'Ticks and mites (8 legs), lice and flies (6 legs)',
    },
  },
  {
    label: 'Body shape',
    values: {
      nematode: 'Long, round in cross-section, tapered at both ends, NOT segmented',
      cestode: 'Flat ribbon made of segments (proglottids) behind a head (scolex)',
      trematode: 'Flat and leaf-shaped (amphistomes: pear-shaped; schistosomes: long and thin), NOT segmented',
      protozoa: 'One cell; seen only under the microscope',
      arthropod: 'Jointed legs, hard outer skeleton',
    },
  },
  {
    label: 'Gut',
    values: {
      nematode: 'Complete gut: mouth to anus',
      cestode: 'No gut — absorb food through the body surface',
      trematode: 'Blind gut: mouth but no anus',
      protozoa: 'None (one cell)',
      arthropod: 'Complete gut',
    },
  },
  {
    label: 'Sexes',
    values: {
      nematode: 'Separate males and females (male smaller; strongyle males have a bursa)',
      cestode: 'Hermaphrodite — every segment has male and female organs',
      trematode: 'Hermaphrodite (except schistosomes: separate sexes)',
      protozoa: 'Divide; some have a sexual stage (in tick or gut)',
      arthropod: 'Separate sexes',
    },
  },
  {
    label: 'How they hold on',
    values: {
      nematode: 'Mouth / buccal capsule; some have a lancet or teeth',
      cestode: 'Suckers on the head (some also hooks)',
      trematode: 'Oral and ventral suckers (amphistomes: a big rear sucker)',
      protozoa: 'Live inside or on cells',
      arthropod: 'Mouthparts and claws',
    },
  },
  {
    label: 'Life cycle',
    values: {
      nematode: 'Mostly DIRECT: eggs → larvae on pasture → eaten. Some need a carrier (mosquito, fly, snail, beetle).',
      cestode: 'Always INDIRECT. Ruminant tapeworms need pasture mites; dog and human tapeworms use ruminants for their cysts.',
      trematode: 'INDIRECT: always a snail (lancet fluke: snail + ant).',
      protozoa: 'Ticks (Theileria, Babesia), biting flies (Trypanosoma), oocysts in dung (coccidia), cats/dogs (Toxoplasma, Neospora), mating (Tritrichomonas).',
      arthropod: 'Direct, on the animal or in its surroundings (sheds, pasture).',
    },
  },
  {
    label: 'Found in the lab by',
    values: {
      nematode: 'Flotation (eggs per gram, McMaster); Baermann for lungworm larvae',
      cestode: 'Segments in dung; flotation (Moniezia eggs); cysts at post-mortem',
      trematode: 'Sedimentation — heavy eggs sink (Fasciola yellow-brown; amphistome clear)',
      protozoa: 'Blood or lymph node smear, dung flotation for oocysts, acid-fast stain, PCR',
      arthropod: 'Seen on the animal; skin scraping for mites',
    },
  },
  {
    label: 'Drugs that work',
    values: {
      nematode: 'Benzimidazoles (albendazole, fenbendazole), levamisole, ivermectin group; closantel for Haemonchus; piperazine for Toxocara',
      cestode: 'Praziquantel; albendazole/fenbendazole/oxfendazole and niclosamide for Moniezia. Larval cysts: no practical treatment — deworm dogs, destroy offal.',
      trematode: 'Triclabendazole, oxyclozanide, closantel, rafoxanide, albendazole (fluke dose); oxyclozanide for amphistomes; praziquantel for schistosomes',
      protozoa: 'Buparvaquone (Theileria), diminazene / imidocarb (Babesia), diminazene / quinapyramine (Trypanosoma), toltrazuril / amprolium / sulfonamides (coccidia)',
      arthropod: 'Acaricides (pyrethroids, amitraz, organophosphates) for ticks; ivermectin group for mites, sucking lice and nasal bots',
    },
  },
  {
    label: 'Common mistake',
    values: {
      nematode: 'Under-dosing and drenching every animal → drug resistance',
      cestode: 'Ivermectin and levamisole do NOT kill tapeworms',
      trematode: 'Ivermectin and levamisole do NOT kill flukes; most flukicides miss young flukes',
      protozoa: 'Dewormers do nothing against protozoa',
      arthropod: 'Treating the animal but not the shed (Hyalomma, mites) → quick re-infestation',
    },
  },
];
