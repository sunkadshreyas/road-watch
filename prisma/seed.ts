import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

function lineString(coordinates: Array<[number, number]>) {
  return JSON.stringify({
    type: "LineString",
    coordinates,
  });
}

function polygon(coordinates: Array<[number, number]>) {
  return JSON.stringify({
    type: "Polygon",
    coordinates: [[...coordinates, coordinates[0]]],
  });
}

async function main() {
  await prisma.observationVote.deleteMany();
  await prisma.issueClusterVote.deleteMany();
  await prisma.repairVerification.deleteMany();
  await prisma.repairEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.communityEntry.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.roadAsset.deleteMany();
  await prisma.ward.deleteMany();

  const ward = await prisma.ward.create({
    data: {
      slug: "ward-94-demo",
      name: "Ward 94",
      city: "Bengaluru",
      summary:
        "Seeded OSM-style road and footpath intelligence demo focused on repeat failures, repair quality, and public transparency.",
      osmReference: "OpenStreetMap sample geometry derived for Indiranagar demo ward",
      centerLat: 12.9738,
      centerLng: 77.6427,
      boundaryGeoJson: polygon([
        [77.6373, 12.9789],
        [77.6488, 12.9789],
        [77.6488, 12.9682],
        [77.6373, 12.9682],
      ]),
    },
  });

  const residentA = await prisma.user.create({
    data: {
      id: "cmosvmckd0001a0x96kzti3b5",
      wardId: ward.id,
      email: "resident-a@roadwatch.demo",
      name: "Resident Desk A",
      publicLabel: "Street Scout A",
      role: "RESIDENT",
    },
  });

  const residentB = await prisma.user.create({
    data: {
      id: "cmosvmcke0002a0x944kgm914",
      wardId: ward.id,
      email: "resident-b@roadwatch.demo",
      name: "Resident Desk B",
      publicLabel: "Street Scout B",
      role: "RESIDENT",
    },
  });

  const engineer = await prisma.user.create({
    data: {
      id: "cmosvmckg0003a0x9w00v5n90",
      wardId: ward.id,
      email: "engineer@roadwatch.demo",
      name: "Ward Engineer",
      publicLabel: "Ward engineer",
      role: "GOV",
    },
  });

  const hundredFeetRoad = await prisma.roadAsset.create({
    data: {
      wardId: ward.id,
      slug: "100-feet-road",
      name: "100 Feet Road",
      assetType: "ROAD",
      osmId: "OSM-W94-R001",
      summary:
        "Primary corridor carrying bus, metro feeder, and mixed commuter traffic. Repeated patch failures are concentrated at the bus bay approach.",
      geometryGeoJson: lineString([
        [77.6391, 12.9769],
        [77.6415, 12.9762],
        [77.6438, 12.9752],
        [77.6464, 12.9739],
      ]),
      centerLat: 12.9756,
      centerLng: 77.6428,
      lengthMeters: 1280,
      importanceScore: 5,
      surfaceLabel: "Bituminous carriageway",
    },
  });

  const cmhRoad = await prisma.roadAsset.create({
    data: {
      wardId: ward.id,
      slug: "cmh-road",
      name: "CMH Road",
      assetType: "ROAD",
      osmId: "OSM-W94-R002",
      summary:
        "Commercial high street with heavy turning movements and frequent curb conflicts between shoppers, street parking, and through traffic.",
      geometryGeoJson: lineString([
        [77.6386, 12.9735],
        [77.6414, 12.9725],
        [77.6442, 12.9714],
        [77.6467, 12.9704],
      ]),
      centerLat: 12.972,
      centerLng: 77.6427,
      lengthMeters: 940,
      importanceScore: 4,
      surfaceLabel: "Urban mixed-use arterial",
    },
  });

  const twelfthMain = await prisma.roadAsset.create({
    data: {
      wardId: ward.id,
      slug: "12th-main-road",
      name: "12th Main Road",
      assetType: "ROAD",
      osmId: "OSM-W94-R003",
      summary:
        "Residential collector where drainage cuts and poor edge repair have started to affect school-hour traffic and pedestrian crossings.",
      geometryGeoJson: lineString([
        [77.6404, 12.9781],
        [77.6413, 12.9759],
        [77.6421, 12.9733],
        [77.643, 12.9708],
      ]),
      centerLat: 12.9747,
      centerLng: 77.6418,
      lengthMeters: 880,
      importanceScore: 3,
      surfaceLabel: "Neighborhood connector",
    },
  });

  const bazaarFootpath = await prisma.roadAsset.create({
    data: {
      wardId: ward.id,
      slug: "bazaar-footpath-north",
      name: "Bazaar Footpath North",
      assetType: "FOOTPATH",
      osmId: "OSM-W94-F001",
      summary:
        "Tight pedestrian edge serving a clinic, school gate, and evening vendors. Encroachment pressure is high and accessibility collapses quickly after dusk.",
      geometryGeoJson: lineString([
        [77.6407, 12.9716],
        [77.6417, 12.9712],
        [77.6432, 12.9707],
        [77.6448, 12.9702],
      ]),
      centerLat: 12.9709,
      centerLng: 77.6426,
      lengthMeters: 520,
      importanceScore: 4,
      surfaceLabel: "Concrete paver footpath",
    },
  });

  const metroFootpath = await prisma.roadAsset.create({
    data: {
      wardId: ward.id,
      slug: "metro-footpath-east",
      name: "Metro Footpath East",
      assetType: "FOOTPATH",
      osmId: "OSM-W94-F002",
      summary:
        "Footpath connecting metro access to the commercial spine. Slab failures and cart spillover force people into the carriageway.",
      geometryGeoJson: lineString([
        [77.6444, 12.9768],
        [77.645, 12.9754],
        [77.6456, 12.9739],
        [77.6462, 12.9724],
      ]),
      centerLat: 12.9746,
      centerLng: 77.6453,
      lengthMeters: 610,
      importanceScore: 5,
      surfaceLabel: "Granite slab footpath",
    },
  });

  const serviceLane = await prisma.roadAsset.create({
    data: {
      wardId: ward.id,
      slug: "old-madras-service-lane",
      name: "Old Madras Service Lane",
      assetType: "ROAD",
      osmId: "OSM-W94-R004",
      summary:
        "Lower-speed frontage lane with loading activity. Drainage and edge occupation issues are moderate but increasingly recurrent.",
      geometryGeoJson: lineString([
        [77.6465, 12.9782],
        [77.6466, 12.9763],
        [77.6468, 12.9744],
        [77.6471, 12.9722],
      ]),
      centerLat: 12.9753,
      centerLng: 77.6468,
      lengthMeters: 760,
      importanceScore: 2,
      surfaceLabel: "Service lane asphalt",
    },
  });

  const observationSeeds: Prisma.ObservationCreateManyInput[] = [
      {
        roadId: hundredFeetRoad.id,
        issueType: "POTHOLE",
        issueClusterKey: "bus-bay-pothole",
        description:
          "Crater opening beside the bus bay seam. Two-wheelers are moving abruptly into the through lane to avoid it.",
        severityScore: 86,
        impactScore: 89,
        gpsLat: 12.9758,
        gpsLng: 77.6431,
        evidencePath: "/uploads/seed/100-feet-road-bus-bay-1.jpg",
        evidenceCapturedAt: new Date("2024-01-15T09:10:00.000Z"),
        createdAt: new Date("2024-01-15T09:10:00.000Z"),
      },
      {
        roadId: hundredFeetRoad.id,
        issueType: "POTHOLE",
        issueClusterKey: "bus-bay-pothole",
        description:
          "The same filled patch has reopened after rain and water now hides the edge condition.",
        severityScore: 74,
        impactScore: 81,
        gpsLat: 12.9758,
        gpsLng: 77.6431,
        evidencePath: "/uploads/seed/100-feet-road-bus-bay-2.jpg",
        evidenceCapturedAt: new Date("2024-09-02T08:40:00.000Z"),
        createdAt: new Date("2024-09-02T08:40:00.000Z"),
      },
      {
        roadId: hundredFeetRoad.id,
        issueType: "POTHOLE",
        issueClusterKey: "bus-bay-pothole",
        description:
          "Third resurfacing attempt has failed; buses are braking sharply before the stop line.",
        severityScore: 79,
        impactScore: 84,
        gpsLat: 12.9757,
        gpsLng: 77.643,
        evidencePath: "/uploads/seed/100-feet-road-bus-bay-3.jpg",
        evidenceCapturedAt: new Date("2025-06-20T09:25:00.000Z"),
        createdAt: new Date("2025-06-20T09:25:00.000Z"),
      },
      {
        roadId: hundredFeetRoad.id,
        issueType: "POTHOLE",
        issueClusterKey: "bus-bay-pothole",
        description:
          "Fresh failure at the same approach. The hole is wider and the edge is breaking into the bus lane.",
        severityScore: 92,
        impactScore: 93,
        gpsLat: 12.9757,
        gpsLng: 77.643,
        evidencePath: "/uploads/seed/100-feet-road-bus-bay-4.jpg",
        evidenceCapturedAt: new Date("2026-02-14T07:55:00.000Z"),
        createdAt: new Date("2026-02-14T07:55:00.000Z"),
      },
      {
        roadId: hundredFeetRoad.id,
        issueType: "UNAUTHORIZED_PARKING",
        issueClusterKey: "median-edge-parking",
        description:
          "Cars are stacking on the shoulder near the tea kiosk and forcing buses to merge late.",
        severityScore: 61,
        impactScore: 58,
        gpsLat: 12.9763,
        gpsLng: 77.6418,
        evidencePath: "/uploads/seed/100-feet-road-parking.jpg",
        evidenceCapturedAt: new Date("2026-03-09T12:20:00.000Z"),
        createdAt: new Date("2026-03-09T12:20:00.000Z"),
      },
      {
        roadId: cmhRoad.id,
        issueType: "MISSING_STREET_LIGHT",
        issueClusterKey: "east-corridor-lighting",
        description:
          "Three poles are dark on the market stretch and visibility drops sharply after 8pm.",
        severityScore: 54,
        impactScore: 63,
        gpsLat: 12.9717,
        gpsLng: 77.6437,
        evidencePath: "/uploads/seed/cmh-lighting.jpg",
        evidenceCapturedAt: new Date("2025-12-09T14:15:00.000Z"),
        createdAt: new Date("2025-12-09T14:15:00.000Z"),
      },
      {
        roadId: cmhRoad.id,
        issueType: "UNAUTHORIZED_PARKING",
        issueClusterKey: "market-edge-parking",
        description:
          "Curb lane is occupied through the evening, blocking autos and deliveries into the travel lane.",
        severityScore: 65,
        impactScore: 69,
        gpsLat: 12.9716,
        gpsLng: 77.6427,
        evidencePath: "/uploads/seed/cmh-parking.jpg",
        evidenceCapturedAt: new Date("2026-03-10T11:35:00.000Z"),
        createdAt: new Date("2026-03-10T11:35:00.000Z"),
      },
      {
        roadId: twelfthMain.id,
        issueType: "POTHOLE",
        issueClusterKey: "drain-cut-settlement",
        description:
          "Settlement around the drain cut is deepening and vehicles are crossing into the opposing lane near the school gate.",
        severityScore: 72,
        impactScore: 74,
        gpsLat: 12.9749,
        gpsLng: 77.6418,
        evidencePath: "/uploads/seed/12th-main-drain-cut.jpg",
        evidenceCapturedAt: new Date("2026-01-22T08:50:00.000Z"),
        createdAt: new Date("2026-01-22T08:50:00.000Z"),
      },
      {
        roadId: bazaarFootpath.id,
        issueType: "FOOTPATH_BLOCKED",
        issueClusterKey: "school-gate-blockage",
        description:
          "Two parked scooters and a pushcart occupy the entire walking strip at school dismissal time.",
        severityScore: 82,
        impactScore: 88,
        gpsLat: 12.9711,
        gpsLng: 77.6429,
        evidencePath: "/uploads/seed/bazaar-school-gate.jpg",
        evidenceCapturedAt: new Date("2026-04-01T10:05:00.000Z"),
        createdAt: new Date("2026-04-01T10:05:00.000Z"),
      },
      {
        roadId: bazaarFootpath.id,
        issueType: "VENDOR_ENCROACHMENT",
        issueClusterKey: "juice-cart-pinch",
        description:
          "Vendor cart narrows the usable footpath to less than a shoulder width during evening rush.",
        severityScore: 68,
        impactScore: 76,
        gpsLat: 12.9708,
        gpsLng: 77.6438,
        evidencePath: "/uploads/seed/bazaar-vendor.jpg",
        evidenceCapturedAt: new Date("2026-03-01T13:15:00.000Z"),
        createdAt: new Date("2026-03-01T13:15:00.000Z"),
      },
      {
        roadId: bazaarFootpath.id,
        issueType: "BROKEN_FOOTPATH",
        issueClusterKey: "tree-root-slab",
        description:
          "Lifted slabs around the tree pit created a wheelchair trap and recurring trip point.",
        severityScore: 73,
        impactScore: 80,
        gpsLat: 12.9709,
        gpsLng: 77.6422,
        evidencePath: "/uploads/seed/bazaar-footpath-tree-root.jpg",
        evidenceCapturedAt: new Date("2025-11-13T09:05:00.000Z"),
        createdAt: new Date("2025-11-13T09:05:00.000Z"),
      },
      {
        roadId: metroFootpath.id,
        issueType: "BROKEN_FOOTPATH",
        issueClusterKey: "pillar-56-slab",
        description:
          "Broken slab and missing edge stone near the metro stair landing are forcing people into live traffic.",
        severityScore: 79,
        impactScore: 82,
        gpsLat: 12.9752,
        gpsLng: 77.6452,
        evidencePath: "/uploads/seed/metro-footpath-slab.jpg",
        evidenceCapturedAt: new Date("2025-08-14T10:00:00.000Z"),
        createdAt: new Date("2025-08-14T10:00:00.000Z"),
      },
      {
        roadId: metroFootpath.id,
        issueType: "FOOTPATH_BLOCKED",
        issueClusterKey: "cart-stack-entrance",
        description:
          "Pull carts are being parked against the railing and cutting the entry width in half.",
        severityScore: 70,
        impactScore: 75,
        gpsLat: 12.9742,
        gpsLng: 77.6457,
        evidencePath: "/uploads/seed/metro-footpath-cart.jpg",
        evidenceCapturedAt: new Date("2026-02-28T15:35:00.000Z"),
        createdAt: new Date("2026-02-28T15:35:00.000Z"),
      },
      {
        roadId: serviceLane.id,
        issueType: "VENDOR_ENCROACHMENT",
        issueClusterKey: "loading-bay-spill",
        description:
          "Temporary stalls spill into the service lane during late afternoon loading hours.",
        severityScore: 49,
        impactScore: 51,
        gpsLat: 12.9748,
        gpsLng: 77.6469,
        evidencePath: "/uploads/seed/service-lane-vendor.jpg",
        evidenceCapturedAt: new Date("2026-01-15T12:05:00.000Z"),
        createdAt: new Date("2026-01-15T12:05:00.000Z"),
      },
  ];

  await prisma.observation.createMany({
    data: observationSeeds.map((observation) => ({
      ...observation,
      humanCheckStatus: "CLEARED",
    })),
  });

  const [
    latestBusBayObservation,
    medianParkingObservation,
    eastLightingObservation,
    schoolGateObservation,
    cartStackObservation,
  ] = await Promise.all([
    prisma.observation.findFirstOrThrow({
      where: {
        roadId: hundredFeetRoad.id,
        evidencePath: "/uploads/seed/100-feet-road-bus-bay-4.jpg",
      },
    }),
    prisma.observation.findFirstOrThrow({
      where: {
        roadId: hundredFeetRoad.id,
        issueClusterKey: "median-edge-parking",
      },
    }),
    prisma.observation.findFirstOrThrow({
      where: {
        roadId: cmhRoad.id,
        issueClusterKey: "east-corridor-lighting",
      },
    }),
    prisma.observation.findFirstOrThrow({
      where: {
        roadId: bazaarFootpath.id,
        issueClusterKey: "school-gate-blockage",
      },
    }),
    prisma.observation.findFirstOrThrow({
      where: {
        roadId: metroFootpath.id,
        issueClusterKey: "cart-stack-entrance",
      },
    }),
  ]);

  await prisma.observationReceipt.createMany({
    data: [
      {
        observationId: latestBusBayObservation.id,
        userId: residentA.id,
        createdAt: latestBusBayObservation.createdAt,
      },
      {
        observationId: medianParkingObservation.id,
        userId: residentA.id,
        createdAt: medianParkingObservation.createdAt,
      },
      {
        observationId: schoolGateObservation.id,
        userId: residentA.id,
        createdAt: schoolGateObservation.createdAt,
      },
      {
        observationId: eastLightingObservation.id,
        userId: residentB.id,
        createdAt: eastLightingObservation.createdAt,
      },
      {
        observationId: cartStackObservation.id,
        userId: residentB.id,
        createdAt: cartStackObservation.createdAt,
      },
    ],
  });

  await prisma.observationVote.createMany({
    data: [
      {
        observationId: latestBusBayObservation.id,
        userId: residentB.id,
        kind: "LIKE",
        createdAt: latestBusBayObservation.createdAt,
        updatedAt: latestBusBayObservation.createdAt,
      },
      {
        observationId: schoolGateObservation.id,
        userId: residentB.id,
        kind: "LIKE",
        createdAt: schoolGateObservation.createdAt,
        updatedAt: schoolGateObservation.createdAt,
      },
      {
        observationId: eastLightingObservation.id,
        userId: residentA.id,
        kind: "DISLIKE",
        createdAt: eastLightingObservation.createdAt,
        updatedAt: eastLightingObservation.createdAt,
      },
    ],
  });

  const repair1 = await prisma.repairEvent.create({
    data: {
      roadId: hundredFeetRoad.id,
      issueClusterKey: "bus-bay-pothole",
      status: "REPAIRED",
      note:
        "Cold-mix fill placed around the bus bay seam after milling only the immediate crater perimeter.",
      costEstimateInr: 36000,
      recordedById: engineer.id,
      scheduledAt: new Date("2024-01-18T03:00:00.000Z"),
      completedAt: new Date("2024-01-20T13:30:00.000Z"),
      createdAt: new Date("2024-01-18T03:00:00.000Z"),
    },
  });

  const repair2 = await prisma.repairEvent.create({
    data: {
      roadId: hundredFeetRoad.id,
      issueClusterKey: "bus-bay-pothole",
      status: "REPAIRED",
      note:
        "Repatch executed after monsoon reopening. Failure edges were sealed but the underlying bus-bay depression remained.",
      costEstimateInr: 38000,
      recordedById: engineer.id,
      scheduledAt: new Date("2024-09-05T04:00:00.000Z"),
      completedAt: new Date("2024-09-07T11:00:00.000Z"),
      createdAt: new Date("2024-09-05T04:00:00.000Z"),
    },
  });

  const repair3 = await prisma.repairEvent.create({
    data: {
      roadId: hundredFeetRoad.id,
      issueClusterKey: "bus-bay-pothole",
      status: "REPAIRED",
      note:
        "Third intervention resurfaced the patch but stopped short of the wheel track where buses are stressing the edge.",
      costEstimateInr: 42000,
      recordedById: engineer.id,
      scheduledAt: new Date("2025-06-24T06:00:00.000Z"),
      completedAt: new Date("2025-06-25T15:30:00.000Z"),
      createdAt: new Date("2025-06-24T06:00:00.000Z"),
    },
  });

  const repair4 = await prisma.repairEvent.create({
    data: {
      roadId: hundredFeetRoad.id,
      issueClusterKey: "bus-bay-pothole",
      status: "IN_PROGRESS",
      note:
        "Current order escalated from patching to localized reconstruction, but the workfront is still active and incomplete.",
      costEstimateInr: 44000,
      recordedById: engineer.id,
      scheduledAt: new Date("2026-02-18T05:00:00.000Z"),
      createdAt: new Date("2026-02-18T05:00:00.000Z"),
    },
  });

  const repair5 = await prisma.repairEvent.create({
    data: {
      roadId: cmhRoad.id,
      issueClusterKey: "east-corridor-lighting",
      status: "REPAIRED",
      note:
        "Pole wiring replaced and cabinet reset after repeated outages across the market stretch.",
      proofImagePath: "/uploads/seed/cmh-lighting-repair.jpg",
      costEstimateInr: 18000,
      recordedById: engineer.id,
      scheduledAt: new Date("2026-04-10T08:00:00.000Z"),
      completedAt: new Date("2026-04-12T17:45:00.000Z"),
      createdAt: new Date("2026-04-10T08:00:00.000Z"),
    },
  });

  const repair6 = await prisma.repairEvent.create({
    data: {
      roadId: bazaarFootpath.id,
      issueClusterKey: "tree-root-slab",
      status: "REPAIRED",
      note:
        "Lifted slabs rebuilt with tactile edge preserved and tree pit reset flush to restore wheelchair movement.",
      proofImagePath: "/uploads/seed/bazaar-footpath-repair.jpg",
      costEstimateInr: 95000,
      recordedById: engineer.id,
      scheduledAt: new Date("2026-01-08T09:00:00.000Z"),
      completedAt: new Date("2026-01-10T16:10:00.000Z"),
      createdAt: new Date("2026-01-08T09:00:00.000Z"),
    },
  });

  const repair7 = await prisma.repairEvent.create({
    data: {
      roadId: metroFootpath.id,
      issueClusterKey: "pillar-56-slab",
      status: "SCHEDULED",
      note:
        "Full slab replacement and railing reset approved but not yet executed because cable diversion is pending.",
      costEstimateInr: 128000,
      recordedById: engineer.id,
      scheduledAt: new Date("2026-05-12T04:30:00.000Z"),
      createdAt: new Date("2026-04-27T04:30:00.000Z"),
    },
  });

  await prisma.repairVerification.createMany({
    data: [
      {
        repairId: repair1.id,
        createdById: residentA.id,
        verdict: "FAILED",
        note: "Patch collapsed within two weeks and buses resumed swerving around the crater.",
        createdAt: new Date("2024-02-05T08:00:00.000Z"),
      },
      {
        repairId: repair2.id,
        createdById: residentB.id,
        verdict: "FAILED",
        note: "Edge broke back open in the first heavy rain and the hole returned in the same footprint.",
        createdAt: new Date("2024-10-10T07:30:00.000Z"),
      },
      {
        repairId: repair3.id,
        createdById: residentA.id,
        verdict: "STILL_BROKEN",
        note: "Surface is smoother but the wheel track is still dropping and ponding during showers.",
        createdAt: new Date("2025-07-18T08:15:00.000Z"),
      },
      {
        repairId: repair5.id,
        createdById: residentB.id,
        verdict: "FIX_HELD",
        note: "Lighting has stayed stable for the past two weeks and the dark pockets are gone.",
        createdAt: new Date("2026-04-25T14:00:00.000Z"),
      },
      {
        repairId: repair6.id,
        createdById: residentA.id,
        verdict: "FIX_HELD",
        note: "Slabs have held through rain and wheelchair movement is possible again at the clinic edge.",
        createdAt: new Date("2026-02-02T12:00:00.000Z"),
      },
    ],
  });

  await prisma.communityEntry.createMany({
    data: [
      {
        roadId: hundredFeetRoad.id,
        authorId: residentA.id,
        category: "DISCUSSION",
        title: "Bus bay approach is causing sudden swerves",
        body:
          "The danger is not only the hole itself. The patch line is exactly where buses cut in, so the whole lane is behaving unpredictably.",
        agreementCount: 11,
        createdAt: new Date("2026-03-02T10:00:00.000Z"),
      },
      {
        roadId: hundredFeetRoad.id,
        authorId: residentB.id,
        category: "SOLUTION",
        title: "Replace the full 50 meter wheel track, not the crater",
        body:
          "Spot fills keep failing because the bus stop approach is carrying the same stress pattern every day. Mill and relay the full stressed section once.",
        agreementCount: 28,
        createdAt: new Date("2026-03-04T09:00:00.000Z"),
      },
      {
        roadId: cmhRoad.id,
        authorId: residentB.id,
        category: "APPRECIATION",
        title: "Lighting repair actually held",
        body:
          "The repaired market stretch is noticeably safer at night. This is the kind of visible maintenance people remember.",
        agreementCount: 14,
        createdAt: new Date("2026-04-26T18:30:00.000Z"),
      },
      {
        roadId: bazaarFootpath.id,
        authorId: residentA.id,
        category: "DISCUSSION",
        title: "School dismissal still pushes families into the road",
        body:
          "The rebuilt slabs helped, but the blockage outside the school gate still removes the walking path during the busiest 20 minutes.",
        agreementCount: 17,
        createdAt: new Date("2026-04-02T10:30:00.000Z"),
      },
      {
        roadId: bazaarFootpath.id,
        authorId: residentB.id,
        category: "APPRECIATION",
        title: "Tree-root repair improved wheelchair movement",
        body:
          "The clinic entrance is usable again and the new finish has stayed level through rain.",
        agreementCount: 19,
        createdAt: new Date("2026-02-03T13:30:00.000Z"),
      },
      {
        roadId: bazaarFootpath.id,
        authorId: residentA.id,
        category: "SOLUTION",
        title: "Designated vendor bay after the school corner",
        body:
          "Move carts 25 meters south and mark a standing zone so the footpath stays open at the gate while vending is still allowed.",
        agreementCount: 24,
        createdAt: new Date("2026-04-03T09:45:00.000Z"),
      },
      {
        roadId: metroFootpath.id,
        authorId: residentB.id,
        category: "SOLUTION",
        title: "Temporary barricade until slab replacement happens",
        body:
          "If the structural repair is waiting on utilities, install a temporary guided channel so metro riders are not pushed into traffic meanwhile.",
        agreementCount: 16,
        createdAt: new Date("2026-04-28T07:50:00.000Z"),
      },
    ],
  });

  await prisma.subscription.createMany({
    data: [
      {
        token: "sub-roadwatch-100-feet",
        roadId: hundredFeetRoad.id,
        userId: residentA.id,
        issueTypesJson: JSON.stringify([
          "POTHOLE",
          "UNAUTHORIZED_PARKING",
        ]),
        eventTypesJson: JSON.stringify([
          "observation",
          "vote",
          "repair",
          "verification",
        ]),
        minSeverity: 60,
        createdAt: new Date("2026-03-05T09:15:00.000Z"),
        updatedAt: new Date("2026-03-05T09:15:00.000Z"),
      },
      {
        token: "sub-roadwatch-bazaar-footpath",
        roadId: bazaarFootpath.id,
        userId: residentB.id,
        issueTypesJson: JSON.stringify([
          "FOOTPATH_BLOCKED",
          "VENDOR_ENCROACHMENT",
          "BROKEN_FOOTPATH",
        ]),
        eventTypesJson: JSON.stringify([
          "observation",
          "vote",
          "repair",
          "verification",
        ]),
        minSeverity: 55,
        createdAt: new Date("2026-04-03T08:00:00.000Z"),
        updatedAt: new Date("2026-04-03T08:00:00.000Z"),
      },
    ],
  });

  await prisma.issueClusterVote.createMany({
    data: [
      {
        roadId: hundredFeetRoad.id,
        issueClusterKey: "bus-bay-pothole",
        userId: residentA.id,
        kind: "LIKE",
      },
      {
        roadId: hundredFeetRoad.id,
        issueClusterKey: "bus-bay-pothole",
        userId: residentB.id,
        kind: "LIKE",
      },
      {
        roadId: hundredFeetRoad.id,
        issueClusterKey: "median-edge-parking",
        userId: residentA.id,
        kind: "LIKE",
      },
      {
        roadId: cmhRoad.id,
        issueClusterKey: "east-corridor-lighting",
        userId: residentA.id,
        kind: "DISLIKE",
      },
      {
        roadId: bazaarFootpath.id,
        issueClusterKey: "school-gate-blockage",
        userId: residentA.id,
        kind: "LIKE",
      },
      {
        roadId: bazaarFootpath.id,
        issueClusterKey: "school-gate-blockage",
        userId: residentB.id,
        kind: "LIKE",
      },
      {
        roadId: metroFootpath.id,
        issueClusterKey: "cart-stack-entrance",
        userId: residentB.id,
        kind: "DISLIKE",
      },
    ],
  });

  void repair4;
  void repair7;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
