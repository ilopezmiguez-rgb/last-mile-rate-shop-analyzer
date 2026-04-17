export type RecordType = "Rate Shop" | "Transaction";

export interface RawRecord {
  record_type: RecordType;
  bt_shipment_id: string;
  origin_zipcode: string;
  destination_metro_code: string;
  weight: number;
  distance: number;
  total_charge: number;
  record_date: string; // ISO yyyy-mm-dd
}

export interface NormalizedRecord extends RawRecord {
  normalized_weight: number;
  zone_name: string;
  is_won: boolean;
}

export type Segment = {
  normalized_weight: number;
  zone_name: string;
  quotes: number;
  wins: number;
  win_rate: number;
  lost_volume: number;
};
