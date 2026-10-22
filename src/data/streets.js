// Street vocabulary (USPS Publication 28 suffixes + common informal forms).
// Used to RECOGNISE street structure, never to rewrite it.

export const STREET_SUFFIXES = new Set(
  `
allee alley ally aly anex annex anx arc arcade av ave aven avenu avenue avn avnue
bayou bch beach bend bg bgs blf blfs bluf bluff bluffs blvd boul boulevard boulv bnd bot bottm bottom br brdge brg
branch brk brks brnch brook brooks btm burg burgs byp bypa bypas bypass byps byu
camp canyn canyon cape cnyn causeway causwa cen cent center centers centr centre cir circ circl circle circles cirs ck
cl clb clf clfs cliff cliffs club cmn cmns cmp cnter cntr common commons cor corner corners cors course court courts
cove coves cp cpe cr crcl crcle creek cres crescent crest crk crossing crossroad crossroads crse crsent crsnt crssng
crst cswy ct ctr ctrs cts curv curve cv cvs cyn dale dam div divide dl dm dr driv drive drives drs drv dv dvd est
estate estates ests exp expr express expressway expw expy ext extension extensions extn extnsn exts fall falls ferry
field fields flat flats fld flds fls flt flts ford fords forest forg forge forges fork forks fort frd frds freeway
freewy frg frgs frk frks frry frst frt frway frwy fry ft fwy garden gardens gardn gateway gatewy gatway gdn gdns glen
glens gln glns grden grdn grdns green greens grn grns grov grove groves grv grvs gtway gtwy harb harbor harbors harbr
haven hbr hbrs heights highway highwy hill hills hiway hiwy hl hllw hls hollow hollows holw holws hrbor ht hts hvn
hway hwy inlet inlt is island islands isle isles islnd islnds iss jct jction jctn jctns jcts junction junctions
junctn juncton key keys knl knls knol knoll knolls ky kys lake lakes land landing lane lck lcks ldg ldge lf lgt lgts
light lights lk lks ln lndg lndng loaf lock locks lodg lodge loop loops mall manor manors mdw mdws meadow meadows
medows mews mill mills missn mission ml mls mnr mnrs mnt mntain mntn mntns motorway mount mountain mountains mountin
msn mssn mt mtin mtn mtns mtwy nck neck opas orch orchard orchrd oval ovl overpass park parks parkway parkways parkwy
pass passage path paths pike pikes pine pines pkway pkwy pkwys pky pl place plain plains plaza pln plns plz plza
pne pnes point points port ports pr prairie prk prr prt prts psge pt pts rad radial radiel radl ramp ranch ranches
rapid rapids rd rdg rdge rdgs rds rest ridge ridges riv river rivr rnch rnchs road roads route row rpd rpds rst rte
rue run rvr shl shls shoal shoals shoar shoars shore shores shr shrs skwy skyway smt spg spgs spng spngs spring springs
sprng sprngs spur spurs sq sqr sqre sqrs sqs squ square squares st sta station statn stn str stra strav straven
stravenue stravn stream streme street streets strm strt strvn strvnue sts sumit sumitt summit ter terr terrace
throughway tpke trace traces track tracks trafficway trail trailer trails trak trce trfy trk trks trl trlr trlrs trls
trnpk trwy tunel tunl tunls tunnel tunnels tunnl turnpike turnpk un underpass union unions uns upas valley valleys
vally vdct via viadct viaduct view views vill villag village villages ville villg villiage vis vist vista vl vlg vlgs
vlly vly vlys vst vsta vw vws walk walks wall way ways well wells wl wls wy xing xrd xrds
`.match(/[a-z]+/g)
);

// Suffixes that are also very common words / names. They only count as a
// suffix when something else already says "this is a street".
export const WEAK_SUFFIXES = new Set([
  "branch", "camp", "cape", "center", "club", "common", "course", "dale", "fall", "field", "ford", "forest",
  "fort", "garden", "green", "haven", "hill", "island", "key", "lake", "land", "light", "mall", "mill", "mount",
  "park", "pass", "pine", "point", "port", "rest", "river", "run", "spring", "station", "union", "view", "village",
  "well", "wall", "ranch", "estate", "estates", "mission", "plaza", "row", "track", "trace", "way", "walk",
  "brook", "brooks",
]);

export const DIRECTIONALS = new Set([
  "n", "s", "e", "w", "ne", "nw", "se", "sw", "north", "south", "east", "west",
  "northeast", "northwest", "southeast", "southwest",
]);

export const UNIT_WORDS = new Set([
  "apt", "apartment", "appt", "unit", "ste", "suite", "lot", "bldg", "building", "fl", "floor", "rm", "room",
  "spc", "space", "trlr", "trailer", "dept", "ph", "penthouse", "no", "box", "slip", "pier", "hngr", "hangar",
]);

// Road names that take a NUMBER instead of a suffix ("FM 1960", "Hwy 287").
export const ROAD_TYPES = new Set([
  "highway", "hwy", "hiway", "county", "cr", "fm", "rm", "route", "rte", "rt", "sh", "us", "interstate", "ih",
  "i", "spur", "loop", "pr", "state", "farm", "ranch", "rural", "rr", "hc", "box", "private", "road", "rd",
]);
