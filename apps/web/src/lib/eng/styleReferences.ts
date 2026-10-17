import { asset } from '@/lib/asset';
/**
 * Real photographs of each design language, from Wikimedia Commons under free licences, shown with their credit.
 * They are references for the style, not a render of anyone's design. Replace a file in `public/styles` and its entry
 * here to change a reference; every entry must keep its author, licence and source.
 */
export interface StyleReference {
  file: string;
  title: string;
  artist: string;
  license: string;
  licenseUrl: string;
  source: string;
}

const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/';

export const STYLE_REFERENCES: Record<
  'modern_najdi' | 'contemporary' | 'swiss' | 'palace',
  StyleReference
> = {
  modern_najdi: {
    file: asset('/styles/najdi.jpg'),
    title: 'Najd vernacular architecture (Ushaiqer)',
    artist: 'Dabailia-sherly',
    license: 'CC BY-SA 4.0',
    licenseUrl: BY_SA_4,
    source: 'https://commons.wikimedia.org/wiki/File:Najd_vernacular_architecture.jpg',
  },
  contemporary: {
    file: asset('/styles/modern.jpg'),
    title: 'Case Study House No. 28, a modernist house',
    artist: 'Junkyardsparkle',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source:
      'https://commons.wikimedia.org/wiki/File:Case_Study_House_No._28_street_view_2015-03-06.jpg',
  },
  swiss: {
    file: asset('/styles/swiss.jpg'),
    title: 'A chalet in Weisstannen-Oberdorf, Switzerland',
    artist: 'Jag9889',
    license: 'CC BY-SA 4.0',
    licenseUrl: BY_SA_4,
    source:
      'https://commons.wikimedia.org/wiki/File:Chalet,_Weisstannen-Oberdorf_SG_20220806-jag9889.jpg',
  },
  palace: {
    file: asset('/styles/palace.jpg'),
    title: 'Shubra Palace, Taif',
    artist: 'KELANTAN JOTTINGS',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Palace_of_the_King._(4264825911).jpg',
  },
};

export const referenceFor = (style: string | undefined): StyleReference | undefined =>
  (STYLE_REFERENCES as Record<string, StyleReference | undefined>)[style ?? ''];
