export class UrlBasedAnalyticsDto {
  url: string;
  totalClicks: number;
  uniqueVisitors: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    url: string,
    totalClicks: number,
    uniqueVisitors: number,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.url = url;
    this.totalClicks = totalClicks;
    this.uniqueVisitors = uniqueVisitors;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
