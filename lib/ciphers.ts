import cipher1 from "@/data/cipher1.json";
import cipher2 from "@/data/cipher2.json";
import cipher3 from "@/data/cipher3.json";
import doiPamphlet from "@/data/doi_pamphlet.json";

export const CIPHER_1 = cipher1 as number[];
export const CIPHER_2 = cipher2 as number[];
export const CIPHER_3 = cipher3 as number[];
export const DOI_PAMPHLET = doiPamphlet as { n: number; word: string }[];

export const PAPER_2_PLAINTEXT = `I have deposited in the county of Bedford, about four miles from Buford's, in an excavation or vault, six feet below the surface of the ground, the following articles, belonging jointly to the parties whose names are given in number three, herewith.
The first deposit consisted of ten hundred and fourteen pounds of gold, and thirty-eight hundred and twelve pounds of silver, deposited Nov. eighteen nineteen. The second was made Dec. eighteen twenty-one, and consisted of nineteen hundred and seven pounds of gold, and twelve hundred and eighty-eight of silver; also jewels, obtained in St. Louis in exchange to save transportation, and valued at thirteen thousand dollars.
The above is securely packed in iron pots, with iron covers. The vault is roughly lined with stone, and the vessels rest on solid stone, and are covered with others. Paper number one describes the exact locality of the vault, so that no difficulty will be had in finding it.`;

export const PRESET_KEYS = [
  {
    id: "declaration_of_independence.txt",
    label: "Declaration of Independence (pamphlet text)",
    year: "1776 / 1885 numbering",
    why: "The only key that has ever produced a readable Beale paper.",
  },
  {
    id: "us_constitution.txt",
    label: "U.S. Constitution",
    year: "1787",
    why: "Long enough for Paper 1, public by 1822, and the natural sibling of the Declaration.",
  },
  {
    id: "articles_of_confederation.txt",
    label: "Articles of Confederation",
    year: "1781",
    why: "A founding charter Beale could have numbered; borderline length unless letters are used.",
  },
  {
    id: "bill_of_rights.txt",
    label: "Bill of Rights",
    year: "1791",
    why: "Too short for word numbering; useful as a letter-stream or concatenated key.",
  },
  {
    id: "virginia_declaration_of_rights.txt",
    label: "Virginia Declaration of Rights",
    year: "1776",
    why: "Local to the supposed burial county. Short; try letter numbering.",
  },
  {
    id: "federalist_10.txt",
    label: "Federalist No. 10",
    year: "1787",
    why: "Madison on faction; widely reprinted by the 1820s.",
  },
  {
    id: "common_sense.txt",
    label: "Common Sense (Thomas Paine)",
    year: "1776",
    why: "Long popular pamphlet. Word count clears 2,906 easily.",
  },
  {
    id: "magna_carta.txt",
    label: "Magna Carta (English text)",
    year: "1215 / later translations",
    why: "A frequently tried 'famous document' key, included as a negative control.",
  },
  {
    id: "beale_papers_narrative.txt",
    label: "The Beale Papers narrative",
    year: "1885",
    why: "If the pamphlet is a hoax, its own prose is the document the fabricator had in front of him.",
  },
] as const;
