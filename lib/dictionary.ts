export const LOCATION_WORDS = [
  "bedford",
  "buford",
  "bufords",
  "montvale",
  "lynchburg",
  "virginia",
  "county",
  "vault",
  "cave",
  "tavern",
  "mountain",
  "peaks",
  "otter",
  "porter",
  "goose",
  "creek",
  "river",
  "road",
  "stone",
  "iron",
  "pots",
  "gold",
  "silver",
  "jewels",
  "miles",
  "mile",
  "north",
  "south",
  "east",
  "west",
  "tree",
  "oak",
  "pine",
  "rock",
  "hill",
  "ridge",
  "hollow",
  "spring",
  "branch",
  "field",
  "fence",
  "path",
  "woods",
  "farm",
  "church",
  "mill",
  "gap",
  "knoll",
  "deposit",
  "excavation",
  "surface",
  "ground",
] as const;

const COMMON_WORDS = `
the of and to in a is that for it as with his on be at by this we from or one
had not but what all were they when will there can each their other about many
then them these so some her would make like him into time has look two more
write go see number no way could people my than first water been call who oil
sit now find long down day did get come made may part over such new sound take
only little work know place year live me back give most very after thing our
just name good sentence man think say great where help through much before line
right too means old any same tell boy follow came want show also around form
three small set put end does another well large must big even such here why ask
went men read need land different home us move try kind hand picture again
change off play spell air away animal house point page letter mother world
answer found study still learn should America world between high every near add
food between keep last thought under last never start city earth eye light
thought head under story saw left don't few while along might close something
seem next hard open example begin life always those both paper together got
group often run important until children side feet car mile night walk white
begin sea began grow took river four carry state once book hear stop without
second later miss idea enough eat face watch far Indian real almost let above
girl sometimes mountains cut young talk soon list song being leave family it's
body music color stand sun questions fish area mark dog horse birds problem
complete room knew since ever piece told usually didn't friends easy heard order
red door sure become top ship across today during short better best however low
hours black products happened whole measure remember early waves reached listen
table travel less morning simple several vowel war lay against pattern slow
center love person money serve appear road map farm pulled draw voice seen cold
cried plan notice south sing war ground fall king town I'll unit power town
certain field rest correct able pound done beauty drive stood contain front
teach final gave dark ball yet am heavy fine pair circle include built can't
matter square syllables perhaps bill felt suddenly test direction center farmers
ready anything divided general energy subject Europe moon region return believe
dance members picked simple cells paint mind love cause rain exercise eggs train
drop finished hope bright gas property practice product happen bright
deposited county excavation vault articles belonging jointly parties names given
number three herewith first deposit consisted hundred fourteen pounds gold
thirty eight twelve silver deposited november eighteen nineteen second december
twenty one nineteen hundred seven twelve eighty eight jewels obtained louis
exchange save transportation valued thirteen thousand dollars above securely
packed iron pots covers roughly lined stone vessels rest solid covered others
paper describes exact locality difficulty finding
`.trim();

function collect(source: string): string[] {
  return source
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 3);
}

export const DICTIONARY: string[] = Array.from(
  new Set([...collect(COMMON_WORDS), ...LOCATION_WORDS]),
).sort((a, b) => b.length - a.length || a.localeCompare(b));

export const DICTIONARY_SET = new Set(DICTIONARY);
export const LOCATION_SET = new Set<string>(LOCATION_WORDS);
