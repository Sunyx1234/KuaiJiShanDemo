// Presentation schedules approved for the ten-order demo. Raw CRM snapshot stays intact.
export interface OrderSchedule {
  createdAt: string
  confirmedAt: string
  releasedAt: string
  shippedAt: string
  deliveredAt: string
  signedAt: string
  expectedArrival: string
}
export const orderSchedules: Record<string, OrderSchedule> = {
  "OD202610120000000085": {
    "createdAt": "2026-09-18T10:25",
    "confirmedAt": "2026-09-19T14:10",
    "releasedAt": "2026-09-22T09:35",
    "shippedAt": "2026-09-23T14:20",
    "deliveredAt": "2026-09-24T10:15",
    "signedAt": "2026-09-24T11:05",
    "expectedArrival": "2026-09-24"
  },
  "OD202610100000000065": {
    "createdAt": "2026-09-23T09:15",
    "confirmedAt": "2026-09-24T11:40",
    "releasedAt": "2026-09-27T14:30",
    "shippedAt": "2026-09-29T08:50",
    "deliveredAt": "2026-09-30T13:10",
    "signedAt": "2026-09-30T14:25",
    "expectedArrival": "2026-09-30"
  },
  "OD202610110000000003": {
    "createdAt": "2026-09-11T15:40",
    "confirmedAt": "2026-09-12T10:20",
    "releasedAt": "2026-09-15T09:45",
    "shippedAt": "2026-09-16T13:30",
    "deliveredAt": "2026-09-17T09:20",
    "signedAt": "2026-09-17T10:35",
    "expectedArrival": "2026-09-17"
  },
  "OD2026101200037": {
    "createdAt": "2026-09-27T11:10",
    "confirmedAt": "2026-09-28T15:25",
    "releasedAt": "2026-10-01T10:40",
    "shippedAt": "2026-10-02T09:15",
    "deliveredAt": "2026-10-05T14:20",
    "signedAt": "2026-10-05T16:05",
    "expectedArrival": "2026-10-05"
  },
  "OD2026090700067": {
    "createdAt": "2026-09-05T14:35",
    "confirmedAt": "2026-09-07T09:50",
    "releasedAt": "2026-09-10T15:10",
    "shippedAt": "2026-09-12T08:40",
    "deliveredAt": "2026-09-15T11:30",
    "signedAt": "2026-09-15T13:15",
    "expectedArrival": "2026-09-15"
  },
  "OD202608020000000005": {
    "createdAt": "2026-08-02T10:10",
    "confirmedAt": "2026-08-03T11:25",
    "releasedAt": "2026-08-05T14:20",
    "shippedAt": "2026-08-07T09:35",
    "deliveredAt": "2026-08-08T13:50",
    "signedAt": "2026-08-08T15:10",
    "expectedArrival": "2026-08-08"
  },
  "OD2026101000080": {
    "createdAt": "2026-09-30T16:20",
    "confirmedAt": "2026-10-02T09:40",
    "releasedAt": "2026-10-05T11:15",
    "shippedAt": "2026-10-06T14:10",
    "deliveredAt": "2026-10-09T10:45",
    "signedAt": "2026-10-09T12:20",
    "expectedArrival": "2026-10-09"
  },
  "OD202610060000000038": {
    "createdAt": "2026-09-24T09:50",
    "confirmedAt": "2026-09-25T14:15",
    "releasedAt": "2026-09-28T10:30",
    "shippedAt": "2026-09-30T13:40",
    "deliveredAt": "2026-10-01T09:25",
    "signedAt": "2026-10-01T10:50",
    "expectedArrival": "2026-10-01"
  },
  "OD202610100000000008": {
    "createdAt": "2026-10-03T10:35",
    "confirmedAt": "2026-10-04T15:20",
    "releasedAt": "2026-10-07T09:10",
    "shippedAt": "2026-10-09T13:25",
    "deliveredAt": "2026-10-11T10:40",
    "signedAt": "2026-10-11T12:05",
    "expectedArrival": "2026-10-11"
  },
  "OD202610120000000027": {
    "createdAt": "2026-10-09T09:45",
    "confirmedAt": "2026-10-10T10:30",
    "releasedAt": "2026-10-12T14:20",
    "shippedAt": "2026-10-13T08:45",
    "deliveredAt": "2026-10-14T11:10",
    "signedAt": "2026-10-14T12:35",
    "expectedArrival": "2026-10-14"
  }
}
