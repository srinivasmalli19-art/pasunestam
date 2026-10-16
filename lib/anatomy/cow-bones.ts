// The cow's bones: their shapes (built from signed distance fields), where
// the landmarks are, and what students should know about each one.
//
// Coordinates: units ≈ 10 cm. Each bone has its own local frame:
//   x = cranial (towards the head), y = dorsal/proximal (up), z = lateral
//   (bones are modelled as the RIGHT bone; the left one is a mirror image).
// Limb bones hang from their proximal joint at the origin down -y.
// Clinical content: typical bovine anatomy; to be reviewed by a veterinarian.

import type { SDF, V3 } from './sdf';

export type Region = 'skull' | 'spine' | 'thorax' | 'forelimb' | 'hindlimb';

export const REGION_NAME: Record<Region, string> = {
  skull: 'Skull',
  spine: 'Vertebral column',
  thorax: 'Ribs & sternum',
  forelimb: 'Forelimb',
  hindlimb: 'Hindlimb',
};

export interface Landmark {
  name: string;
  desc: string;
  /** Approximate point in the bone's local frame (moved onto the surface when drawn). */
  at: V3;
  clinical?: boolean;
  /** For tube-shaped bones (ribs): position along the rib, 0 = head, 1 = ventral end. */
  t?: number;
}

export interface BoneShape {
  sdf: SDF;
  min: V3;
  max: V3;
}

export interface BoneInfo {
  id: string;
  name: string;
  region: Region;
  /** "1 pair", "13", … */
  count: string;
  summary: string;
  landmarks: Landmark[];
  notes?: string[];
}

// =====================================================================================
// What students learn about each bone
// =====================================================================================

export const BONES: Record<string, BoneInfo> = {
  skull: {
    id: 'skull',
    name: 'Skull',
    region: 'skull',
    count: '1',
    summary:
      'The ox skull is long and wedge-shaped. The frontal bone is huge and forms the whole roof of the cranium up to the poll, where it carries the horn cores. There are no upper incisor teeth — a dental pad instead.',
    landmarks: [
      { name: 'Cornual process (horn core)', desc: 'Bony core of the horn, an outgrowth of the frontal bone. Its hollow centre communicates with the frontal sinus in adults.', at: [0.2, 1.5, 1.8] },
      { name: 'Intercornual protuberance', desc: 'The highest point of the skull (the poll) between the horns.', at: [0.18, 1.25, 0.2] },
      { name: 'Temporal line / lateral frontal crest', desc: 'Ridge from the horn base to the orbit. The cornual nerve runs just below it.', at: [1.3, 0.8, 1.05], clinical: true },
      { name: 'Orbit', desc: 'Complete bony ring (closed orbit) facing laterally.', at: [2.55, 0.7, 1.15] },
      { name: 'Temporal fossa', desc: 'Depression behind the orbit for the temporalis muscle.', at: [1.0, 0.42, 1.15] },
      { name: 'Facial tuber', desc: 'Bump on the maxilla above the cheek teeth.', at: [3.15, -0.12, 1.05] },
      { name: 'Infraorbital foramen', desc: 'Opening for the infraorbital nerve, above the first cheek tooth.', at: [3.72, -0.12, 0.85], clinical: true },
      { name: 'Zygomatic arch', desc: 'Bony bar below the orbit to the temporal bone.', at: [1.8, -0.12, 1.12] },
      { name: 'Incisive bone (dental pad)', desc: 'Front of the upper jaw — no incisors; the lower incisors press against a hard dental pad.', at: [5.1, -0.45, 0.25] },
      { name: 'Nasal aperture', desc: 'Bony opening of the nose.', at: [5.3, -0.1, 0.1] },
      { name: 'Occipital condyles', desc: 'Articulate with the atlas (the “yes” joint).', at: [-0.25, -0.12, 0.33] },
      { name: 'Foramen magnum', desc: 'Large opening where the spinal cord leaves the skull.', at: [-0.4, 0.0, 0.1] },
      { name: 'Paracondylar (jugular) process', desc: 'Projection beside the condyle; muscle attachment.', at: [0.08, -0.8, 0.72] },
      { name: 'Tympanic bulla', desc: 'Bony capsule of the middle ear.', at: [0.45, -0.6, 0.75] },
    ],
    notes: [
      'Cornual (horn) nerve block: inject midway between the lateral canthus of the eye and the horn base, just below the temporal line.',
      'Dehorning opens the frontal sinus in adult cattle — sinusitis can follow.',
    ],
  },
  mandible: {
    id: 'mandible',
    name: 'Mandible (lower jaw)',
    region: 'skull',
    count: '1 (two halves)',
    summary: 'Two halves joined at the front by the mandibular symphysis, which in cattle stays a fibrous joint (does not fully fuse). Carries 8 lower incisor teeth (6 incisors + 2 canines that look like incisors) and the cheek teeth.',
    landmarks: [
      { name: 'Incisor part', desc: 'Holds the 8 lower incisor teeth used for ageing cattle.', at: [4.9, -0.75, 0.2] },
      { name: 'Diastema', desc: 'The toothless gap between incisors and cheek teeth.', at: [4.0, -0.9, 0.4] },
      { name: 'Mental foramen', desc: 'Opening for the mental nerve on the lateral side.', at: [4.25, -0.82, 0.45], clinical: true },
      { name: 'Body (cheek teeth)', desc: 'Holds the premolars and molars.', at: [2.8, -1.0, 0.72] },
      { name: 'Vascular notch', desc: 'Notch in the ventral border where the facial artery crosses — a pulse-taking site.', at: [1.95, -1.42, 0.75], clinical: true },
      { name: 'Angle of the mandible', desc: 'Rounded caudoventral corner.', at: [1.2, -1.4, 0.78] },
      { name: 'Ramus', desc: 'Vertical part rising to the jaw joint.', at: [1.25, -0.5, 0.86] },
      { name: 'Mandibular foramen', desc: 'On the medial side of the ramus; the inferior alveolar nerve enters here.', at: [1.3, -0.5, 0.62] },
      { name: 'Condylar process', desc: 'Forms the temporomandibular joint.', at: [1.0, 0.25, 0.85] },
      { name: 'Coronoid process', desc: 'Attachment of the temporalis muscle.', at: [1.8, 0.4, 0.72] },
    ],
    notes: ['Age is estimated from the eruption and wear of the lower incisors.'],
  },
  atlas: {
    id: 'atlas',
    name: 'Atlas (C1)',
    region: 'spine',
    count: '1',
    summary: 'A ring with broad wings and no body. It carries the skull. In the ox the atlas has no transverse foramen.',
    landmarks: [
      { name: 'Wing (ala)', desc: 'Broad, flat lateral plate — palpable behind the skull.', at: [0, 0.25, 0.95] },
      { name: 'Cranial articular fovea', desc: 'Deep cup for the occipital condyle.', at: [0.45, 0.2, 0.3] },
      { name: 'Dorsal tubercle', desc: 'On the dorsal arch.', at: [0, 0.78, 0] },
      { name: 'Ventral tubercle', desc: 'On the ventral arch.', at: [0, -0.3, 0] },
      { name: 'Lateral vertebral foramen', desc: 'For the first cervical nerve.', at: [0.15, 0.55, 0.42] },
      { name: 'Alar foramen', desc: 'Through the wing.', at: [0.05, 0.25, 0.75] },
    ],
    notes: ['The atlanto-occipital space is a site for CSF collection.'],
  },
  axis: {
    id: 'axis',
    name: 'Axis (C2)',
    region: 'spine',
    count: '1',
    summary: 'The longest cervical vertebra. Its dens (spout-shaped in the ox) projects forward into the atlas — the pivot for turning the head (“no” joint).',
    landmarks: [
      { name: 'Dens', desc: 'Peg that projects into the atlas.', at: [0.85, 0.05, 0.1] },
      { name: 'Spinous process', desc: 'A long, high crest.', at: [-0.1, 1.15, 0.05] },
      { name: 'Transverse process', desc: 'Small, directed caudally.', at: [-0.65, -0.15, 0.55] },
      { name: 'Caudal articular process', desc: 'Joins C3.', at: [-0.7, 0.42, 0.35] },
      { name: 'Lateral vertebral foramen', desc: 'For the second cervical nerve.', at: [0.25, 0.55, 0.32] },
    ],
  },
  cervical: {
    id: 'cervical',
    name: 'Cervical vertebra (C3–C7)',
    region: 'spine',
    count: '7 cervical in total (C1–C7)',
    summary: 'Short, strong neck vertebrae. Spinous processes get taller towards C7. C6 has a large ventral lamina; C7 has a tall spine and no transverse foramen.',
    landmarks: [
      { name: 'Body', desc: 'With a convex head and concave fossa.', at: [0, -0.2, 0.2] },
      { name: 'Vertebral foramen', desc: 'The spinal canal.', at: [0.55, 0.55, 0] },
      { name: 'Spinous process', desc: 'Low on C3–C5, taller on C6 and C7.', at: [0, 1.0, 0.05] },
      { name: 'Transverse process', desc: 'Dorsal and ventral tubercles.', at: [0, -0.05, 0.6] },
      { name: 'Transverse foramen', desc: 'For the vertebral artery (absent on C7).', at: [0.55, 0.05, 0.38] },
      { name: 'Articular processes', desc: 'Large in the neck — allow wide movement.', at: [0.55, 0.7, 0.28] },
    ],
  },
  thoracic: {
    id: 'thoracic',
    name: 'Thoracic vertebra (T1–T13)',
    region: 'spine',
    count: '13',
    summary: 'Each carries a pair of ribs. The tall spinous processes of T2–T5 form the withers. The spines lean caudally up to T13 (the anticlinal vertebra in the ox).',
    landmarks: [
      { name: 'Spinous process', desc: 'Tallest at T2–T5 (withers); leans backwards.', at: [-0.3, 2.2, 0.05] },
      { name: 'Body', desc: 'Short body.', at: [0, -0.25, 0.15] },
      { name: 'Costal foveae', desc: 'Cranial and caudal facets for the head of the rib.', at: [0.4, 0.15, 0.25] },
      { name: 'Transverse process', desc: 'Has a facet for the tubercle of the rib.', at: [-0.05, 0.6, 0.55] },
      { name: 'Mammillary process', desc: 'Small knob on the transverse process.', at: [0.02, 0.8, 0.2] },
      { name: 'Lateral vertebral foramen', desc: 'Extra nerve opening found in the ox.', at: [0.12, 0.75, 0.3] },
      { name: 'Vertebral foramen', desc: 'The spinal canal.', at: [0.4, 0.5, 0] },
    ],
  },
  lumbar: {
    id: 'lumbar',
    name: 'Lumbar vertebra (L1–L6)',
    region: 'spine',
    count: '6',
    summary: 'Long, flat transverse processes form the roof of the flank and can be felt through the skin — they are the landmarks for paravertebral anaesthesia.',
    landmarks: [
      { name: 'Transverse process', desc: 'Long, flat and horizontal; tips palpable in the flank.', at: [0, 0.05, 1.7], clinical: true },
      { name: 'Spinous process', desc: 'Broad and vertical.', at: [0, 1.4, 0.05] },
      { name: 'Body', desc: 'Long body.', at: [0, -0.3, 0.15] },
      { name: 'Mammillary process', desc: 'On the cranial articular process.', at: [0.4, 0.7, 0.25] },
      { name: 'Vertebral foramen', desc: 'The spinal canal.', at: [0.5, 0.5, 0] },
    ],
    notes: [
      'Proximal paravertebral block (T13, L1, L2 nerves): needles at the cranial edges of the transverse processes of L1, L2 and L3, near the spine.',
      'Distal paravertebral block: at the tips of the transverse processes of L1, L2 and L4.',
    ],
  },
  sacrum: {
    id: 'sacrum',
    name: 'Sacrum',
    region: 'spine',
    count: '1 (5 fused vertebrae)',
    summary: 'Five vertebrae fused into one bone with a continuous median sacral crest. Joined to the ilium at the sacroiliac joint.',
    landmarks: [
      { name: 'Median sacral crest', desc: 'The fused spinous processes.', at: [0, 1.05, 0.05] },
      { name: 'Wing (ala)', desc: 'Joins the ilium (sacroiliac joint).', at: [1.4, 0.15, 1.05] },
      { name: 'Dorsal sacral foramina', desc: 'For the dorsal branches of the sacral nerves.', at: [0.25, 0.47, 0.45] },
      { name: 'Promontory', desc: 'Cranioventral edge of the first sacral body — the top of the pelvic inlet.', at: [1.85, -0.25, 0.1] },
    ],
    notes: ['Before calving the sacrosciatic ligaments relax and the tail head appears to sink — a sign calving is near.'],
  },
  caudal: {
    id: 'caudal',
    name: 'Caudal (tail) vertebra',
    region: 'spine',
    count: '18–20',
    summary: 'Get smaller and simpler towards the tail tip. The first few have haemal arches/processes on the ventral side protecting the median caudal vessels.',
    landmarks: [
      { name: 'Body', desc: 'Cylindrical body.', at: [0, -0.1, 0.15] },
      { name: 'Haemal process', desc: 'Ventral projection; the median caudal vein and artery run between them.', at: [0.2, -0.35, 0.05], clinical: true },
      { name: 'Transverse process', desc: 'Small, disappears towards the tip.', at: [0, 0, 0.35] },
    ],
    notes: ['Tail (coccygeal) vein: blood collection on the midline under the tail, about 10–15 cm from the base.', 'Caudal epidural: at the sacrococcygeal or first intercoccygeal space (felt by moving the tail up and down).'],
  },
  rib: {
    id: 'rib',
    name: 'Rib',
    region: 'thorax',
    count: '13 pairs (8 sternal + 5 asternal)',
    summary: 'Ribs 1–8 reach the sternum through their costal cartilages (sternal ribs); 9–13 join the costal arch (asternal ribs). Ox ribs are broad and flat.',
    landmarks: [
      { name: 'Head', desc: 'Articulates with the costal foveae of two neighbouring vertebrae.', at: [0, 0, 0], t: 0 },
      { name: 'Neck', desc: 'Short part between head and tubercle.', at: [0, 0, 0], t: 0.08 },
      { name: 'Tubercle', desc: 'Articulates with the transverse process of the vertebra.', at: [0, 0, 0], t: 0.18 },
      { name: 'Angle', desc: 'Where the rib turns downwards.', at: [0, 0, 0], t: 0.35 },
      { name: 'Body', desc: 'Long, broad and flat in the ox.', at: [0, 0, 0], t: 0.65 },
      { name: 'Costochondral junction', desc: 'Where the bony rib meets its costal cartilage.', at: [0, 0, 0], t: 1 },
    ],
    notes: ['Liver biopsy: right side, 11th intercostal space, on a line from the tuber coxae to the shoulder.', 'Left paralumbar fossa (behind the last rib) is the site for rumenotomy and left-flank surgery.'],
  },
  sternum: {
    id: 'sternum',
    name: 'Sternum',
    region: 'thorax',
    count: '1 (7 sternebrae)',
    summary: 'The breastbone: manubrium at the front, a body of sternebrae, and the xiphoid process with its cartilage at the back.',
    landmarks: [
      { name: 'Manubrium', desc: 'The front sternebra, where the first ribs attach.', at: [0.3, 0.1, 0.15] },
      { name: 'Body (sternebrae)', desc: 'Costal cartilages of ribs 2–8 attach between them.', at: [-2.6, -0.6, 0.27] },
      { name: 'Xiphoid process', desc: 'Back end, with the xiphoid cartilage. The reticulum lies just behind and above it.', at: [-5.9, -1.1, 0.35], clinical: true },
    ],
    notes: ['Traumatic reticuloperitonitis (hardware disease): pain on pressure just behind the xiphoid.'],
  },
  scapula: {
    id: 'scapula',
    name: 'Scapula (shoulder blade)',
    region: 'forelimb',
    count: '1 pair',
    summary: 'A triangular plate on the side of the chest, with the scapular spine ending in a distinct acromion in the ox. Joined to the trunk only by muscles (no collarbone).',
    landmarks: [
      { name: 'Scapular spine', desc: 'Ridge dividing the lateral surface; placed towards the cranial border in the ox.', at: [0.25, 2.6, 0.42] },
      { name: 'Acromion', desc: 'Distal end of the spine — present in the ox (absent in the horse).', at: [0.12, 0.6, 0.42] },
      { name: 'Supraspinous fossa', desc: 'Narrow area cranial to the spine.', at: [0.85, 3.2, 0.08] },
      { name: 'Infraspinous fossa', desc: 'Larger area caudal to the spine.', at: [-0.6, 3.0, 0.08] },
      { name: 'Subscapular fossa', desc: 'Medial surface against the ribs.', at: [-0.1, 2.6, -0.08] },
      { name: 'Dorsal border', desc: 'Carries the scapular cartilage.', at: [0.2, 4.1, 0.05] },
      { name: 'Neck', desc: 'Narrow part above the joint.', at: [0, 1.0, 0.25] },
      { name: 'Glenoid cavity', desc: 'Joint surface for the head of the humerus (shoulder joint).', at: [0, -0.2, 0.15] },
      { name: 'Supraglenoid tubercle', desc: 'Origin of the biceps brachii.', at: [0.5, 0.2, 0.05] },
      { name: 'Coracoid process', desc: 'Small medial projection.', at: [0.5, 0.1, -0.22] },
    ],
  },
  humerus: {
    id: 'humerus',
    name: 'Humerus',
    region: 'forelimb',
    count: '1 pair',
    summary: 'Arm bone between the shoulder and the elbow. In the ox the greater tubercle is high and the intertubercular (bicipital) groove is single.',
    landmarks: [
      { name: 'Head', desc: 'Articulates with the glenoid cavity of the scapula.', at: [-0.6, 0.0, 0] },
      { name: 'Greater tubercle', desc: 'Large lateral process rising above the head (point of the shoulder).', at: [0.4, 0.45, 0.3] },
      { name: 'Lesser tubercle', desc: 'Medial process.', at: [0.3, 0.0, -0.48] },
      { name: 'Intertubercular groove', desc: 'Single groove for the biceps tendon (two in the horse).', at: [0.58, -0.05, -0.03] },
      { name: 'Deltoid tuberosity', desc: 'Lateral roughening for the deltoid muscle.', at: [0.25, -0.9, 0.38] },
      { name: 'Teres major tuberosity', desc: 'Medial roughening.', at: [-0.2, -0.95, -0.34] },
      { name: 'Brachialis groove', desc: 'Spiral groove on the lateral surface (brachialis muscle, radial nerve).', at: [0.1, -1.35, 0.36] },
      { name: 'Condyle', desc: 'Distal joint surface for the radius and ulna (elbow).', at: [0.35, -2.7, 0] },
      { name: 'Medial epicondyle', desc: 'Origin of the flexor muscles.', at: [-0.25, -2.42, -0.55] },
      { name: 'Lateral epicondyle', desc: 'Origin of the extensor muscles.', at: [-0.25, -2.42, 0.52] },
      { name: 'Olecranon fossa', desc: 'Deep pit receiving the anconeal process of the ulna.', at: [-0.4, -2.45, 0] },
    ],
  },
  radiusUlna: {
    id: 'radiusUlna',
    name: 'Radius and ulna',
    region: 'forelimb',
    count: '1 pair',
    summary: 'Forearm bones. In the ox the ulna is complete but joined to the radius along its length, leaving small proximal and distal interosseous spaces.',
    landmarks: [
      { name: 'Olecranon tuber', desc: 'Point of the elbow; attachment of the triceps.', at: [-0.6, 1.05, 0] },
      { name: 'Anconeal process', desc: 'Fits into the olecranon fossa of the humerus.', at: [-0.12, 0.38, 0] },
      { name: 'Trochlear notch', desc: 'Joint surface for the humeral condyle.', at: [0.25, 0.13, 0.05] },
      { name: 'Head of the radius', desc: 'Articulates with the humerus.', at: [0.3, -0.08, 0.2] },
      { name: 'Radial tuberosity', desc: 'Insertion of the biceps brachii.', at: [0.38, -0.4, -0.2] },
      { name: 'Body of the radius', desc: 'Flattened cranio-caudally.', at: [0.3, -1.5, 0.1] },
      { name: 'Proximal interosseous space', desc: 'Gap between radius and ulna.', at: [-0.12, -0.5, 0.2] },
      { name: 'Distal interosseous space', desc: 'Small gap near the carpus.', at: [-0.06, -2.45, 0.3] },
      { name: 'Medial styloid process', desc: 'Medial end of the radius.', at: [0.0, -2.92, -0.53] },
      { name: 'Lateral styloid process', desc: 'Distal end of the ulna.', at: [-0.1, -2.9, 0.55] },
    ],
  },
  carpus: {
    id: 'carpus',
    name: 'Carpus (“knee”)',
    region: 'forelimb',
    count: '6 bones each side',
    summary: 'Two rows of short bones. Proximal row: radial, intermediate, ulnar and accessory carpal bones. Distal row: the fused 2nd + 3rd carpal and the 4th carpal (the 1st is absent).',
    landmarks: [
      { name: 'Radial carpal bone', desc: 'Medial bone of the proximal row.', at: [0.32, -0.13, -0.3] },
      { name: 'Intermediate carpal bone', desc: 'Middle of the proximal row.', at: [0.33, -0.13, 0.03] },
      { name: 'Ulnar carpal bone', desc: 'Lateral bone of the proximal row.', at: [0.27, -0.13, 0.38] },
      { name: 'Accessory carpal bone', desc: 'Projects caudally; palpable behind the knee.', at: [-0.5, -0.12, 0.3] },
      { name: 'Fused 2nd + 3rd carpal bone', desc: 'Medial bone of the distal row.', at: [0.33, -0.42, -0.15] },
      { name: '4th carpal bone', desc: 'Lateral bone of the distal row.', at: [0.3, -0.42, 0.3] },
    ],
    notes: ['Carpal hygroma (swollen knees) is common in cattle on hard floors.'],
  },
  metacarpal: {
    id: 'metacarpal',
    name: 'Large metacarpal bone (cannon)',
    region: 'forelimb',
    count: '1 pair',
    summary: 'Metacarpals III and IV fused into one cannon bone. A groove on the front marks where they joined; a small metacarpal V sits proximolaterally.',
    landmarks: [
      { name: 'Dorsal longitudinal groove', desc: 'Line of fusion of metacarpals III and IV; carries a vessel.', at: [0.3, -1.1, 0] },
      { name: 'Proximal articular surface', desc: 'Joins the distal row of carpal bones.', at: [0.1, 0.0, 0.2] },
      { name: 'Proximal metacarpal canal', desc: 'Small canal between the two fused bones.', at: [0.24, -0.3, 0] },
      { name: 'Distal metacarpal canal', desc: 'Small canal just above the trochleae.', at: [0.24, -1.78, 0] },
      { name: 'Trochleae (III and IV)', desc: 'Two distal joint surfaces, one for each digit (fetlock joints).', at: [0.15, -2.1, 0.22] },
      { name: 'Intertrochlear notch', desc: 'Separates the two trochleae.', at: [0.0, -2.18, 0] },
      { name: 'Metacarpal V', desc: 'Small rudiment on the lateral side.', at: [-0.12, -0.35, 0.48] },
    ],
  },
  coxae: {
    id: 'coxae',
    name: 'Os coxae (hip bone)',
    region: 'hindlimb',
    count: '1 pair (form the pelvis with the sacrum)',
    summary: 'Ilium, ischium and pubis fused around the acetabulum. The tuber coxae (“hooks”) and ischial tubers (“pins”) are the main landmarks for body condition scoring and calving.',
    landmarks: [
      { name: 'Tuber coxae (hook bone)', desc: 'Lateral corner of the ilium — the “hook”. Used in body condition scoring.', at: [3.0, 1.5, 1.35] },
      { name: 'Tuber sacrale', desc: 'Dorsal corner of the ilium beside the sacrum.', at: [1.8, 2.12, -1.3] },
      { name: 'Wing of the ilium', desc: 'Broad plate between the two tubers.', at: [1.8, 1.45, 0.05] },
      { name: 'Greater ischiatic notch', desc: 'Nerve and vessels pass through it to the hindlimb.', at: [-0.6, 0.75, -0.3] },
      { name: 'Acetabulum', desc: 'Hip-joint socket for the head of the femur.', at: [0, -0.1, 0.1] },
      { name: 'Acetabular notch', desc: 'Gap in the rim of the acetabulum.', at: [-0.1, -0.52, 0.45] },
      { name: 'Ischial tuber (pin bone)', desc: 'Three-pointed (trifid) in the ox — the “pin”.', at: [-3.3, 0.5, -0.5] },
      { name: 'Obturator foramen', desc: 'Large opening in the floor of the pelvis.', at: [-1.15, -0.65, -1.05] },
      { name: 'Pubis', desc: 'Cranial part of the pelvic floor.', at: [-0.65, -1.0, -1.65] },
      { name: 'Pelvic symphysis', desc: 'Where the two hip bones meet on the floor of the pelvis.', at: [-1.7, -1.3, -1.95] },
    ],
    notes: [
      'Hooks and pins are used for body condition scoring.',
      'The pelvic inlet (between sacral promontory and pubis) decides whether a calf can pass — pelvimetry.',
      'Hip dislocation and fractures of the tuber coxae (“knocked-down hip”) occur after falls.',
    ],
  },
  femur: {
    id: 'femur',
    name: 'Femur (thigh bone)',
    region: 'hindlimb',
    count: '1 pair',
    summary: 'The longest bone of the hindlimb. The ox femur has no third trochanter. The MEDIAL ridge of the trochlea is much larger than the lateral ridge — important for upward fixation of the patella.',
    landmarks: [
      { name: 'Head', desc: 'Fits into the acetabulum.', at: [0.05, 0.1, -0.8] },
      { name: 'Fovea of the head', desc: 'Pit for the ligament of the femoral head.', at: [0.1, 0.25, -0.68] },
      { name: 'Neck', desc: 'Between head and shaft.', at: [0.25, -0.15, -0.1] },
      { name: 'Greater trochanter', desc: 'Lateral process for the gluteal muscles; level with the head.', at: [-0.1, 0.55, 0.6] },
      { name: 'Trochanteric fossa', desc: 'Deep pit behind the greater trochanter.', at: [-0.55, 0.0, 0.28] },
      { name: 'Lesser trochanter', desc: 'Medial process.', at: [-0.38, -0.62, -0.4] },
      { name: 'Supracondylar fossa', desc: 'Shallow pit above the lateral condyle (gastrocnemius origin).', at: [-0.48, -2.72, 0.28] },
      { name: 'Medial trochlear ridge', desc: 'The LARGER ridge of the trochlea. The patella can hook over it (upward fixation of the patella).', at: [0.58, -3.0, -0.3], clinical: true },
      { name: 'Lateral trochlear ridge', desc: 'Smaller lateral ridge.', at: [0.48, -3.05, 0.3] },
      { name: 'Trochlear groove', desc: 'The patella glides in it.', at: [0.55, -3.1, 0] },
      { name: 'Medial and lateral condyles', desc: 'Articulate with the tibia (stifle joint).', at: [-0.3, -3.6, 0.33] },
      { name: 'Intercondylar fossa', desc: 'Between the condyles; cruciate ligaments attach here.', at: [-0.42, -3.55, 0] },
    ],
    notes: ['Upward fixation of the patella: the hind leg locks straight. Treatment: medial patellar desmotomy (cutting the medial patellar ligament) — see the 3D Stifle module.'],
  },
  patella: {
    id: 'patella',
    name: 'Patella (kneecap)',
    region: 'hindlimb',
    count: '1 pair',
    summary: 'A large sesamoid bone in the tendon of the quadriceps, gliding in the trochlea of the femur. In cattle it is held by THREE patellar ligaments: medial, middle and lateral.',
    landmarks: [
      { name: 'Base', desc: 'Proximal end; the quadriceps attaches.', at: [0, 0.42, 0.1] },
      { name: 'Apex', desc: 'Distal point; the middle patellar ligament attaches.', at: [0.05, -0.5, 0.05] },
      { name: 'Articular surface', desc: 'Glides on the femoral trochlea.', at: [-0.25, 0, 0.1] },
      { name: 'Medial border (parapatellar cartilage)', desc: 'Carries the parapatellar fibrocartilage that hooks over the medial trochlear ridge in upward fixation.', at: [0, 0.05, -0.3], clinical: true },
    ],
  },
  tibia: {
    id: 'tibia',
    name: 'Tibia (with fibula)',
    region: 'hindlimb',
    count: '1 pair',
    summary: 'Main bone of the leg. The fibula is reduced to a small head fused to the lateral condyle and a separate malleolar bone at the hock.',
    landmarks: [
      { name: 'Medial and lateral condyles', desc: 'The tibial plateau (stifle joint).', at: [0, -0.05, 0.45] },
      { name: 'Intercondylar eminence', desc: 'Cruciate ligaments and menisci attach around it.', at: [0, 0.12, 0] },
      { name: 'Tibial tuberosity', desc: 'Insertion of all three patellar ligaments.', at: [0.6, -0.32, 0], clinical: true },
      { name: 'Tibial crest', desc: 'Sharp cranial border below the tuberosity.', at: [0.35, -1.0, 0] },
      { name: 'Extensor groove', desc: 'For the extensor tendons.', at: [0.42, -0.3, 0.45] },
      { name: 'Head of the fibula', desc: 'Small process fused to the lateral condyle (shaft absent).', at: [-0.05, -0.4, 0.62] },
      { name: 'Medial malleolus', desc: 'Medial bump at the hock.', at: [0, -3.85, -0.52] },
      { name: 'Malleolar bone (lateral malleolus)', desc: 'Separate small bone = distal end of the fibula.', at: [0, -3.8, 0.56] },
      { name: 'Cochlea', desc: 'Distal grooved joint surface for the talus.', at: [0.2, -3.95, 0] },
    ],
    notes: ['Medial patellar desmotomy: the medial patellar ligament is cut near its insertion on the tibial tuberosity.'],
  },
  tarsus: {
    id: 'tarsus',
    name: 'Tarsus (hock)',
    region: 'hindlimb',
    count: '5 bones each side',
    summary: 'The talus has a trochlea at BOTH ends in ruminants. The calcaneus forms the point of the hock. The central and 4th tarsal bones are fused (centroquartal).',
    landmarks: [
      { name: 'Talus (proximal trochlea)', desc: 'Articulates with the cochlea of the tibia.', at: [0.3, 0.05, 0.13] },
      { name: 'Talus (distal trochlea)', desc: 'A second trochlea — typical of ruminants.', at: [0.38, -0.5, 0.12] },
      { name: 'Calcaneal tuber', desc: 'Point of the hock; the common calcanean (Achilles) tendon inserts here.', at: [-0.8, 1.05, 0.12], clinical: true },
      { name: 'Sustentaculum tali', desc: 'Medial shelf of the calcaneus; the deep flexor tendon runs over it.', at: [-0.3, -0.3, -0.38] },
      { name: 'Centroquartal bone', desc: 'Fused central + 4th tarsal bones.', at: [0.3, -0.75, 0.2] },
      { name: 'Fused 2nd + 3rd tarsal bone', desc: 'Medial distal row.', at: [0.3, -0.95, -0.2] },
    ],
  },
  metatarsal: {
    id: 'metatarsal',
    name: 'Large metatarsal bone',
    region: 'hindlimb',
    count: '1 pair',
    summary: 'Fused metatarsals III and IV. Longer, slimmer and more square in section than the metacarpal, with a deeper dorsal groove.',
    landmarks: [
      { name: 'Dorsal longitudinal groove', desc: 'Deep groove marking the fusion line.', at: [0.32, -1.2, 0] },
      { name: 'Proximal articular surface', desc: 'Joins the distal tarsal bones.', at: [0.1, 0.0, 0.2] },
      { name: 'Distal metatarsal canal', desc: 'Small canal above the trochleae.', at: [0.26, -1.98, 0] },
      { name: 'Trochleae (III and IV)', desc: 'For the two weight-bearing digits.', at: [0.15, -2.35, 0.22] },
      { name: 'Intertrochlear notch', desc: 'Separates the trochleae.', at: [0.0, -2.42, 0] },
    ],
  },
  p1: {
    id: 'p1',
    name: 'Proximal phalanx (P1)',
    region: 'forelimb',
    count: '2 per foot (digits III and IV)',
    summary: 'Pastern bone. Cattle walk on two main digits (III medial, IV lateral); digits II and V are the small dewclaws with no bony contact.',
    landmarks: [
      { name: 'Proximal articular surface', desc: 'Fetlock joint with the metacarpal/metatarsal trochlea.', at: [0, 0.02, 0.1] },
      { name: 'Body', desc: 'Short shaft.', at: [0.14, -0.35, 0] },
      { name: 'Distal head', desc: 'Pastern joint with P2.', at: [0.1, -0.65, 0.08] },
    ],
  },
  p2: {
    id: 'p2',
    name: 'Middle phalanx (P2)',
    region: 'forelimb',
    count: '2 per foot',
    summary: 'Short pastern bone, partly inside the hoof.',
    landmarks: [
      { name: 'Proximal articular surface', desc: 'Pastern joint with P1.', at: [0, 0.02, 0.1] },
      { name: 'Distal head', desc: 'Coffin joint with P3 and the distal sesamoid (navicular) bone.', at: [0.1, -0.45, 0.08] },
    ],
  },
  p3: {
    id: 'p3',
    name: 'Distal phalanx (P3, coffin bone)',
    region: 'forelimb',
    count: '2 per foot',
    summary: 'Inside the claw. Its shape follows the hoof wall; the sole lies under it.',
    landmarks: [
      { name: 'Extensor process', desc: 'Top of the bone; extensor tendon attaches.', at: [0.05, 0.1, 0] },
      { name: 'Toe (apex)', desc: 'Front tip — toe ulcers and white-line lesions here.', at: [0.7, -0.3, 0], clinical: true },
      { name: 'Flexor tuberosity', desc: 'Deep flexor tendon attaches. Sole ulcers form under it.', at: [-0.25, -0.38, 0], clinical: true },
      { name: 'Solar surface', desc: 'Faces the sole.', at: [0.3, -0.42, 0] },
    ],
    notes: ['Sole ulcer, white-line disease and laminitis all involve the tissues around P3.', 'Claw (digit) amputation is done through P2 or the distal P1 for septic coffin-joint infection.'],
  },
};

/** Vertebral formula of the ox. */
export const VERTEBRAL_FORMULA = 'C7 · T13 · L6 · S5 · Cy18–20';
