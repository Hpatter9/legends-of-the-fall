// Painted road scenes, bundled into offline-cached game.js. No follow-up scene borrows a mismatched image.
import type { EventKind } from './sim/events';
import pact from './art/road-encounters/pact.webp';
import temper from './art/road-encounters/temper.webp';
import refugees from './art/road-encounters/refugees.webp';
import scout from './art/road-encounters/scout.webp';
import deserters from './art/road-encounters/deserters.webp';
import cardsharp from './art/road-encounters/cardsharp.webp';
import healer from './art/road-encounters/healer.webp';
import crown from './art/road-encounters/crown.webp';

export const ROAD_ART: Readonly<Partial<Record<EventKind, string>>> = { pact, temper, refugees, scout, deserters, cardsharp, healer, crown };
