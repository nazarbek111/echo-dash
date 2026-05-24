export const COUNTRIES = [
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'US', name: 'USA',         flag: '🇺🇸' },
  { code: 'GB', name: 'UK',          flag: '🇬🇧' },
  { code: 'TR', name: 'Turkey',      flag: '🇹🇷' },
  { code: 'RU', name: 'Russia',      flag: '🇷🇺' },
  { code: 'DE', name: 'Germany',     flag: '🇩🇪' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'JP', name: 'Japan',       flag: '🇯🇵' },
  { code: 'XX', name: 'Other',       flag: '🌍' },
]

export const REGIONS_BY_COUNTRY = {
  'Kazakhstan': ['Almaty','Astana','Shymkent','Karaganda','Aktobe','Taraz','Turkestan','Atyrau','Pavlodar','Other'],
  'USA':         ['New York','Los Angeles','Chicago','Houston','Phoenix','Other'],
  'UK':          ['London','Manchester','Birmingham','Edinburgh','Other'],
  'Turkey':      ['Istanbul','Ankara','Izmir','Bursa','Other'],
  'Russia':      ['Moscow','Saint Petersburg','Novosibirsk','Kazan','Other'],
  'Germany':     ['Berlin','Hamburg','Munich','Cologne','Other'],
  'South Korea': ['Seoul','Busan','Incheon','Daegu','Other'],
  'Japan':       ['Tokyo','Osaka','Kyoto','Yokohama','Other'],
  'Other':       ['Other'],
}

export function flagFor(country) {
  return COUNTRIES.find(c => c.name === country)?.flag || '🌍'
}
