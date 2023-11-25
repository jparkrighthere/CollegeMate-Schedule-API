/**
 * Define type and used CRUD methods for schedule
 *
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
// import ServerConfig from '../../ServerConfig';

// DB Container id
const SCHEDULE = 'schedule';

interface Event {
  id: string;
  title: string;
  location: string | undefined;
  meetingDaysList: string[];
  startTime: {
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  endTime: {
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  memo: string;
  colorCode: number;
}

export default class Schedule {
  id: string;
  email: string;
  termCode: string;
  sessionList: {
    id: string;
    colorCode: number;
  }[];
  eventList: Event[];

  constructor(
    id: string,
    email: string,
    termCode: string,
    sessionList: {
      id: string;
      colorCode: number;
    }[],
    eventList: Event[]
  ) {
    this.id = id;
    this.email = email;
    this.termCode = termCode;
    this.sessionList = sessionList;
    this.eventList = eventList;
  }

  /**
   * Create a new schedule
   * 
   * @param {Cosmos.Database} dbClient Cosmos DB Client
   * @param {Schedule} schedule Schedule object to create
   */
  static async create(dbClient: Cosmos.Database, schedule: Schedule) {
    await dbClient.container(SCHEDULE).items.create(schedule);
  }
}
