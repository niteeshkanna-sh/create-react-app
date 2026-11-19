/**
 * A drawing for a place that has no photograph yet.
 *
 * Ten of the nineteen places have none, and until now those showed a grey
 * panel with the category written across it on /places and a blank card on
 * the home page. Both read as something missing rather than as something
 * drawn -- and one whole kind of place, the waterfalls, had no picture at
 * all between its three entries.
 *
 * Silhouettes against a dusk sky, because that is what this coast looks
 * like and because it is the only way a small dark picture reads: the first
 * attempt drew each subject in gold on navy, in the palette the service
 * cards use, and at the size of a card the whole set came out as navy on
 * navy. A shape cut out of a lit sky is legible at any size, and the outline
 * is what tells a gopuram from a basilica from a fort.
 *
 * They are plainly drawings, which is the point: a photograph of Thirparappu
 * taken by somebody else and put on a hire company's site is that person's
 * photograph. These are not pretending to be one.
 *
 * The floor rather than the ceiling. Upload a photograph against the place
 * in the panel and it replaces the drawing on both pages, with no change
 * here.
 */

export const PLACE_SCENES = [
  'waterfall',
  'beach',
  'coast',
  'temple',
  'church',
  'fort',
  'palace',
  'bridge',
  'lighthouse',
  'viewpoint',
] as const;

export type PlaceSceneName = (typeof PLACE_SCENES)[number];

/**
 * Which drawing a place gets.
 *
 * The name is asked first and the category second, because a category is a
 * shelf and the name is the thing: the lighthouse and the hanging bridge are
 * filed under "Coast & sea" and "Waterfalls & hills", and neither is what
 * those shelves are mostly full of.
 *
 * Matched on lowercase fragments rather than exact strings, so renaming a
 * category in the panel from "Coast & sea" to "The coast" does not quietly
 * send every one of them back to the default.
 */
export function sceneFor(name: string, category: string): PlaceSceneName {
  const n = name.toLowerCase();
  if (/lighthouse/.test(n)) return 'lighthouse';
  if (/bridge/.test(n)) return 'bridge';
  if (/church|basilica|cathedral/.test(n)) return 'church';
  if (/fort|kottai/.test(n)) return 'fort';
  if (/palace/.test(n)) return 'palace';
  if (/falls|waterfall/.test(n)) return 'waterfall';
  if (/beach|shore/.test(n)) return 'beach';
  if (/tower|viewpoint/.test(n)) return 'viewpoint';
  if (/temple|mandapam|memorial|statue/.test(n)) return 'temple';

  const c = category.toLowerCase();
  if (/waterfall|hill|falls/.test(c)) return 'waterfall';
  if (/beach/.test(c)) return 'beach';
  if (/temple|heritage/.test(c)) return 'temple';
  if (/view|point|tower/.test(c)) return 'viewpoint';
  return 'coast';
}

/**
 * The sky, the sun and the ground, shared so the ten sit together.
 *
 * Rendered once in App rather than inside each drawing: ten copies of the
 * same four gradients is forty nodes on the places page describing four
 * gradients.
 */
export function PlaceSceneDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="pl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1407" />
          <stop offset="38%" stopColor="#1f2a52" />
          <stop offset="64%" stopColor="#5d4a63" />
          <stop offset="84%" stopColor="#c8873a" />
          <stop offset="100%" stopColor="#ffc53d" />
        </linearGradient>
        <linearGradient id="pl-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e4a8" />
          <stop offset="100%" stopColor="#c8873a" />
        </linearGradient>
        <radialGradient id="pl-sun">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ffc53d" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffc53d" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** The lit sky, with the sun sitting on the horizon it lights. */
function Sky({ sun = 300, line = 182 }: { sun?: number; line?: number }) {
  return (
    <>
      <rect width="400" height="250" fill="url(#pl-sky)" />
      <circle cx={sun} cy={line - 14} r="74" fill="url(#pl-sun)" />
      <circle cx={sun} cy={line - 14} r="23" fill="#fff3cf" opacity="0.9" />
    </>
  );
}

/** Flat water from the horizon down, with the sun's track across it. */
function Water({ line = 182, sun = 300 }: { line?: number; sun?: number }) {
  return (
    <>
      <rect y={line} width="400" height={250 - line} fill="#141d3a" />
      <g fill="#ffc53d" opacity="0.4">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={sun - 13 - i * 5}
            y={line + 6 + i * 13}
            width={26 + i * 10}
            height="5"
            rx="2.5"
          />
        ))}
      </g>
      <g stroke="#f6e4a8" strokeOpacity="0.22" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M20 206 H112" />
        <path d="M46 230 H168" />
      </g>
    </>
  );
}

const DARK = '#0d0903';

function Waterfall() {
  return (
    <>
      {/* The sun sits in the open on the right. Behind a hill it lit the
          hill from inside -- the glow came through at the opacity the
          silhouette was drawn at, and two pale grey triangles are not what
          a hill at dusk looks like. */}
      <Sky sun={352} line={186} />
      {/* Hills behind, then the cliff the water comes off, which has to be
          the darkest thing so the fall reads as light through a gap. Opaque,
          for the same reason. */}
      <path d="M0 186 L52 98 L116 186Z" fill="#111a34" />
      <path d="M72 186 L128 120 L180 186Z" fill="#0b1226" />
      <path d="M138 186 V92 Q168 80 206 86 L228 70 L288 82 V186Z" fill={DARK} />
      {/* The fall: a wide sheet with two thinner ribbons beside it. */}
      <g fill="url(#pl-water)">
        <path d="M196 92 Q192 140 196 188 L224 188 Q228 140 224 92Z" />
        <path d="M178 98 Q175 142 178 188 L188 188 Q185 142 188 98Z" opacity="0.75" />
        <path d="M232 96 Q230 142 233 188 L243 188 Q240 142 243 96Z" opacity="0.7" />
      </g>
      {/* Spray at the foot of it. */}
      <g fill="#fff3cf" opacity="0.45">
        <circle cx="194" cy="188" r="13" />
        <circle cx="216" cy="192" r="17" />
        <circle cx="240" cy="188" r="11" />
      </g>
      {/* The pool, catching the fall. */}
      <rect y="194" width="400" height="56" fill="#141d3a" />
      <g fill="#f6e4a8" opacity="0.32">
        <rect x="192" y="204" width="36" height="5" rx="2.5" />
        <rect x="182" y="220" width="58" height="5" rx="2.5" />
        <rect x="170" y="236" width="82" height="5" rx="2.5" />
      </g>
      <g stroke="#f6e4a8" strokeOpacity="0.2" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M30 214 H132" />
        <path d="M282 228 H372" />
      </g>
      {/* Rocks in the foreground. */}
      <path d="M0 250 L34 218 L78 250Z" fill={DARK} />
      <path d="M296 250 L340 212 L394 250Z" fill={DARK} />
    </>
  );
}

function Beach() {
  return (
    <>
      <Sky sun={262} line={168} />
      <Water line={168} sun={262} />
      {/* Sand, curving up the frame the way a bay does. */}
      <path d="M0 214 Q120 196 232 210 Q330 222 400 206 L400 250 L0 250Z" fill="#2a2416" />
      <path d="M0 228 Q134 210 248 224 Q340 234 400 220 L400 250 L0 250Z" fill={DARK} />
      {/* Two palms, leaning the way the wind comes off the sea. */}
      <g stroke={DARK} strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M78 224 Q66 172 52 142" />
        <path d="M52 142 Q28 132 12 148M52 142 Q30 116 8 116M52 142 Q76 122 100 132M52 142 Q72 112 98 106M52 142 Q58 118 50 100" />
      </g>
      <g stroke={DARK} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M344 236 Q356 196 370 170" />
        <path d="M370 170 Q352 158 334 166M370 170 Q354 144 334 140M370 170 Q392 158 400 166M370 170 Q378 146 396 136" />
      </g>
    </>
  );
}

function Coast() {
  return (
    <>
      <Sky sun={286} line={158} />
      <Water line={158} sun={286} />
      {/* The cape is granite, not sand: rocks are the thing to draw. */}
      <path d="M0 250 L26 198 L72 250Z" fill={DARK} />
      <path d="M44 250 L112 180 L182 250Z" fill={DARK} />
      <path d="M150 250 L196 214 L240 250Z" fill={DARK} opacity="0.85" />
      <path d="M312 244 L352 202 L398 244Z" fill={DARK} opacity="0.9" />
    </>
  );
}

/** Tiers, finials and a doorway: the outline that says gopuram. */
function Temple() {
  return (
    <>
      <Sky sun={320} line={196} />
      <g fill={DARK}>
        <path d="M128 196 V86 L160 26 H240 L272 86 V196Z" />
        {[168, 192, 216, 236].map((cx, i) => (
          <g key={cx}>
            <rect x={cx - 8} y={[18, 14, 14, 18][i]} width="16" height="9" rx="2" />
            <circle cx={cx} cy={[12, 8, 8, 12][i] - 1} r="6" />
          </g>
        ))}
        <rect x="52" y="160" width="76" height="36" />
        <rect x="272" y="160" width="76" height="36" />
        <rect y="196" width="400" height="54" />
      </g>
      {/* Lit from behind, so the tiers and the gate read as cut out of it. */}
      <g stroke="url(#pl-sky)" strokeWidth="3" opacity="0.5" fill="none">
        <path d="M136 160 H264M144 128 H256M152 96 H248" />
      </g>
      <path d="M178 196 V148 A22 22 0 0 1 222 148 V196Z" fill="#c8873a" opacity="0.55" />
    </>
  );
}

/** Two spires and a rose window: a basilica, not a gopuram. */
function Church() {
  return (
    <>
      <Sky sun={74} line={196} />
      <g fill={DARK}>
        <path d="M150 196 V96 H250 V196Z" />
        <path d="M200 96 L200 68" />
        <path d="M150 96 L200 56 L250 96Z" />
        {/* The towers. */}
        <path d="M120 196 V86 H154 V196Z" />
        <path d="M246 196 V86 H280 V196Z" />
        <path d="M120 86 L137 34 L154 86Z" />
        <path d="M246 86 L263 34 L280 86Z" />
        <rect x="134" y="20" width="6" height="16" rx="2" />
        <rect x="260" y="20" width="6" height="16" rx="2" />
        <rect x="128" y="26" width="18" height="5" rx="2" />
        <rect x="254" y="26" width="18" height="5" rx="2" />
        <rect y="196" width="400" height="54" />
      </g>
      {/* The rose window and the door, lit from inside. */}
      <circle cx="200" cy="118" r="15" fill="#ffc53d" opacity="0.65" />
      <path d="M184 196 V152 A16 16 0 0 1 216 152 V196Z" fill="#c8873a" opacity="0.6" />
      <g fill="#ffc53d" opacity="0.4">
        <rect x="130" y="112" width="12" height="26" rx="6" />
        <rect x="258" y="112" width="12" height="26" rx="6" />
      </g>
    </>
  );
}

/** A sea wall with its teeth, on a headland. */
function Fort() {
  return (
    <>
      <Sky sun={300} line={176} />
      <Water line={176} sun={300} />
      <g fill={DARK}>
        {/* The rampart, stepping up to a bastion on the left. */}
        <path d="M0 250 V128 H96 V152 H250 V168 H400 V250Z" />
        {/* Crenellations along the top of each run. */}
        {[6, 28, 50, 72].map((x) => (
          <rect key={`a${x}`} x={x} y="114" width="13" height="16" />
        ))}
        {[104, 134, 164, 194, 224].map((x) => (
          <rect key={`b${x}`} x={x} y="138" width="13" height="16" />
        ))}
        {[258, 292, 326, 360].map((x) => (
          <rect key={`c${x}`} x={x} y="154" width="13" height="16" />
        ))}
      </g>
      {/* Embrasures: the gaps a fort is looked out of. */}
      <g fill="#c8873a" opacity="0.5">
        <rect x="24" y="166" width="14" height="22" rx="4" />
        <rect x="60" y="166" width="14" height="22" rx="4" />
        <rect x="150" y="186" width="14" height="20" rx="4" />
        <rect x="198" y="186" width="14" height="20" rx="4" />
      </g>
    </>
  );
}

/** Tiled roofs stacked down a slope: the wooden palace. */
function Palace() {
  return (
    <>
      <Sky sun={326} line={198} />
      <g fill={DARK}>
        {/* Three ranges, each roof wider than the one above it. */}
        <path d="M120 96 L200 56 L280 96 L272 104 H128Z" />
        <rect x="140" y="104" width="120" height="30" />
        <path d="M88 134 L200 92 L312 134 L304 142 H96Z" />
        <rect x="112" y="142" width="176" height="28" />
        <path d="M54 170 L200 126 L346 170 L338 178 H62Z" />
        <rect x="70" y="178" width="260" height="20" />
        <rect y="198" width="400" height="52" />
        {/* The gable finial. */}
        <rect x="196" y="40" width="8" height="18" rx="3" />
      </g>
      {/* Shuttered windows under each eave. */}
      <g fill="#ffc53d" opacity="0.4">
        {[156, 180, 204, 228].map((x) => (
          <rect key={`u${x}`} x={x} y="112" width="12" height="16" rx="3" />
        ))}
        {[128, 158, 188, 218, 248].map((x) => (
          <rect key={`m${x}`} x={x} y="148" width="14" height="16" rx="3" />
        ))}
      </g>
    </>
  );
}

/** A footbridge on piers, over a gorge. */
function Bridge() {
  return (
    <>
      <Sky sun={96} line={196} />
      <path d="M0 196 V96 L92 196Z" fill={DARK} />
      <path d="M400 196 V86 L302 196Z" fill={DARK} />
      <rect y="196" width="400" height="54" fill="#141d3a" />
      <g fill={DARK}>
        {/* The deck and the piers under it. */}
        <rect x="28" y="118" width="344" height="12" rx="3" />
        {[76, 150, 224, 298].map((x) => (
          <rect key={x} x={x} y="130" width="11" height="66" />
        ))}
        {/* The handrail, which is what says it is walked across. */}
        <rect x="28" y="90" width="344" height="5" rx="2.5" />
        {[52, 92, 132, 172, 212, 252, 292, 332].map((x) => (
          <rect key={`p${x}`} x={x} y="90" width="5" height="28" />
        ))}
      </g>
      <g fill="#f6e4a8" opacity="0.26">
        <rect x="110" y="212" width="86" height="5" rx="2.5" />
        <rect x="172" y="232" width="118" height="5" rx="2.5" />
      </g>
    </>
  );
}

function Lighthouse() {
  return (
    <>
      <Sky sun={316} line={178} />
      <Water line={178} sun={316} />
      <g fill={DARK}>
        {/* The tower, its lamp room and the rock it stands on. */}
        <path d="M112 196 L130 68 H166 L184 196Z" />
        <path d="M124 68 H172 V54 H124Z" />
        <path d="M132 54 H164 V28 H132Z" />
        <rect x="144" y="12" width="7" height="18" rx="3" />
        <path d="M74 250 L120 188 L186 250Z" />
      </g>
      {/* The lamp, and the beam it throws out to sea. */}
      <circle cx="148" cy="40" r="11" fill="#fff3cf" opacity="0.9" />
      {/* Narrow and faint. At a fifth opacity and the width of the frame
          they were a grey wash across the whole sky rather than a beam. */}
      <g fill="#fff3cf" opacity="0.1">
        <path d="M158 36 L400 14 L400 34Z" />
        <path d="M138 36 L0 20 L0 40Z" />
      </g>
    </>
  );
}

/** A lookout on the high ground, with the view it is a point for. */
function Viewpoint() {
  return (
    <>
      <Sky sun={300} line={190} />
      <path d="M0 190 L104 96 L204 190Z" fill={DARK} opacity="0.55" />
      <g fill={DARK}>
        <path d="M150 190 L262 60 L390 190Z" />
        {/* The tower: legs, a deck and a rail above the ridge. */}
        <path d="M238 108 L232 48 H292 L286 108Z" />
        <rect x="222" y="36" width="80" height="12" rx="4" />
        <rect x="230" y="14" width="64" height="24" rx="4" />
        <rect x="258" y="2" width="7" height="14" rx="3" />
      </g>
      <g fill="#ffc53d" opacity="0.45">
        <rect x="240" y="20" width="14" height="13" rx="3" />
        <rect x="262" y="20" width="14" height="13" rx="3" />
      </g>
      <rect y="190" width="400" height="60" fill="#141d3a" />
      <g stroke="#f6e4a8" strokeOpacity="0.2" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M24 212 H140" />
        <path d="M56 234 H206" />
        <path d="M268 220 H378" />
      </g>
    </>
  );
}

const SCENES: Record<PlaceSceneName, () => React.JSX.Element> = {
  waterfall: Waterfall,
  beach: Beach,
  coast: Coast,
  temple: Temple,
  church: Church,
  fort: Fort,
  palace: Palace,
  bridge: Bridge,
  lighthouse: Lighthouse,
  viewpoint: Viewpoint,
};

export function PlaceScene({
  name,
  category,
  className,
}: {
  name: string;
  category: string;
  className?: string;
}) {
  const Scene = SCENES[sceneFor(name, category)];

  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <Scene />
    </svg>
  );
}
