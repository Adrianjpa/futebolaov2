import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getFlagUrl = (country: string) => {
  // Normalization map to handle common variations
  const normalizedCountry = country?.trim();

  const countryMap: { [key: string]: string } = {
    "Espanha": "es", "Spain": "es",
    "Alemanha": "de", "Germany": "de",
    "França": "fr", "France": "fr",
    "Itália": "it", "Italy": "it",
    "Holanda": "nl", "Netherlands": "nl",
    "Portugal": "pt",
    "Inglaterra": "gb-eng", "England": "gb-eng",
    "Grécia": "gr", "Greece": "gr",
    "Rússia": "ru", "Russia": "ru",
    "Brasil": "br", "Brazil": "br",
    "Argentina": "ar",
    "Croácia": "hr", "Croatia": "hr",
    "República Tcheca": "cz", "Czech Republic": "cz",
    "Dinamarca": "dk", "Denmark": "dk",
    "Suécia": "se", "Sweden": "se",
    "Ucrânia": "ua", "Ukraine": "ua",
    "Polônia": "pl", "Poland": "pl",
    "Irlanda": "ie", "Ireland": "ie"
  };

  const code = countryMap[normalizedCountry];
  return code ? `https://flagcdn.com/w40/${code}.png` : "";
};

const LEGACY_TOURNAMENT_YEARS: Record<string, string> = {
  'e51e5682-f677-48e3-94c7-196e618d306a': '2006',
  '44a74d5b-10a9-46a8-b82b-0be87be69998': '2008',
  '2ecad449-e20f-4084-8ae6-c017083db04a': '2012',
  '07532a36-6556-44ac-a1c2-7f56d42dc4fe': '2014',
  'f1d9edfe-7227-4423-a5f2-491f23e65fd5': '2016',
  'f5a811ac-82d4-49da-891d-d1118ce88ff8': '2018',
  '14ae358e-cc7b-424c-8f4c-9faed5bbac67': '2019'
};

export function formatMatchDate(dateInput: string | Date, championshipId?: string) {
  if (championshipId && LEGACY_TOURNAMENT_YEARS[championshipId]) {
    return LEGACY_TOURNAMENT_YEARS[championshipId];
  }

  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  const timeStr = format(date, "HH:mm", { locale: ptBR });

  if (isToday(date)) return `Hoje, ${timeStr}`;
  if (isTomorrow(date)) return `Amanhã, ${timeStr}`;
  if (isYesterday(date)) return `Ontem, ${timeStr}`;

  return format(date, "dd/MM HH:mm", { locale: ptBR });
}

export function translateRoundName(round: string) {
  if (!round) return "Rodada --";

  // Check if it's a number (e.g. "1", "38")
  if (!isNaN(Number(round))) return `Rodada ${round}`;

  const map: Record<string, string> = {
    "REGULAR_SEASON": "Temporada Regular",
    "GROUP_STAGE": "Fase de Grupos",
    "ROUND_OF_16": "Oitavas de Final",
    "QUARTER_FINALS": "Quartas de Final",
    "SEMI_FINALS": "Semifinal",
    "FINAL": "Final",
    "Playoffs": "Playoffs",
    "Relegation Round": "Rebaixamento"
  };

  // Normalize comparison
  const key = round.replace(/_/g, " ").toUpperCase().replace(/\s+/g, "_");

  // Try exact match or mapped key
  return map[round] || map[key] || round;
}
