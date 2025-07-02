export interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  timestamp: number;
  year: number;
}

export interface MarkedDate {
  key: string;
  color: string;
}

export interface MarkedDates {
  [date: string]: {
    dots: MarkedDate[];
  };
}
