export const popularAirports = [
  { code: "MNL", name: "Manila - Ninoy Aquino",          city: "Manila",        lat: 14.5086,  lon: 121.0194 },
  { code: "CEB", name: "Cebu - Mactan",                  city: "Cebu",          lat: 10.3075,  lon: 123.9789 },
  { code: "CRK", name: "Clark International",            city: "Pampanga",      lat: 15.186,   lon: 120.56   },
  { code: "DVO", name: "Davao International",            city: "Davao",         lat: 7.1255,   lon: 125.6456 },
  { code: "ILO", name: "Iloilo International",           city: "Iloilo",        lat: 10.8331,  lon: 122.4933 },
  { code: "KLO", name: "Kalibo International",           city: "Kalibo",        lat: 11.6794,  lon: 122.3761 },
  { code: "PPS", name: "Puerto Princesa",                city: "Palawan",       lat: 9.7421,   lon: 118.7592 },
  { code: "TAG", name: "Tagbilaran Airport",             city: "Bohol",         lat: 9.6641,   lon: 123.8531 },
  { code: "BCD", name: "Bacolod-Silay",                  city: "Bacolod",       lat: 10.7764,  lon: 123.015  },
  { code: "GES", name: "General Santos",                 city: "General Santos",lat: 6.058,    lon: 125.0961 },
  { code: "BXU", name: "Butuan Airport",                 city: "Butuan",        lat: 8.9515,   lon: 125.4789 },
  { code: "DGT", name: "Sibulan Airport",                city: "Dumaguete",     lat: 9.3337,   lon: 123.3004 },
  { code: "MPH", name: "Godofredo P. Ramos Airport",     city: "Malay (Boracay)",lat: 11.9244, lon: 121.9537 },
  { code: "TAC", name: "Daniel Z. Romualdez Airport",    city: "Tacloban",      lat: 11.2279,  lon: 125.0278 },
  { code: "USU", name: "Francisco B. Reyes Airport",     city: "Busuanga (Coron)",lat: 12.1215,lon: 120.1001 },
  { code: "ZAM", name: "Zamboanga International Airport",city: "Zamboanga",     lat: 6.9224,   lon: 122.0596 },
  { code: "CGY", name: "Laguindingan Airport",           city: "Cagayan de Oro",lat: 8.6156,   lon: 124.4569 },
  { code: "SFS", name: "Subic Bay International Airport",city: "Subic Bay",     lat: 14.7944,  lon: 120.2711 },
  { code: "OMC", name: "Ormoc Airport",                  city: "Ormoc",         lat: 11.058,   lon: 124.5649 },
  { code: "LAO", name: "Laoag International Airport",    city: "Laoag",         lat: 18.1781,  lon: 120.5317 },
];

export const getAirportCoordinates = (iataCode) =>
  popularAirports.find((a) => a.code === iataCode) ?? null;
