/**
 * Jest Unit Test for POST /schedule/course-list/:termCode/update method
 *
 * @author Seok-Hee (Steve) Han <seokheehan01@gmail.com>
 */

// eslint-disable-next-line node/no-unpublished-import
import * as request from 'supertest';
import * as Cosmos from '@azure/cosmos';
import TestEnv from '../../TestEnv';
import ExpressServer from '../../../src/ExpressServer';
import AuthToken from '../../../src/datatypes/Token/AuthToken';
import * as jwt from 'jsonwebtoken';
import TestConfig from '../../TestConfig';
import CourseListMetaData from '../../../src/datatypes/courseListMetaData/CourseListMetaData';

describe('POST /schedule/course-list/:termCode/update - Update Course List (API Use / Admin Use)', () => {
  let testEnv: TestEnv;
  const tokenMap = {
    admin: '',
    user: '',
    refresh: '',
    invalid: '',
  };

  beforeEach(async () => {
    // Setup test environment
    testEnv = new TestEnv(expect.getState().currentTestName as string);

    // Start Test Environment
    await testEnv.start();

    // Create a test tokens
    const tokenContent: AuthToken = {
      id: 'test',
      type: 'access',
      tokenType: 'serverAdmin',
      accountType: 'admin',
    };
    tokenMap.admin = jwt.sign(tokenContent, testEnv.testConfig.jwt.secretKey, {
      algorithm: 'HS512',
      expiresIn: '60m',
    });

    tokenContent.tokenType = 'user';
    tokenMap.user = jwt.sign(tokenContent, testEnv.testConfig.jwt.secretKey, {
      algorithm: 'HS512',
      expiresIn: '60m',
    });
    tokenContent.tokenType = 'serverAdmin';

    tokenContent.type = 'refresh';
    tokenMap.refresh = jwt.sign(
      tokenContent,
      testEnv.testConfig.jwt.secretKey,
      {
        algorithm: 'HS512',
        expiresIn: '60m',
      }
    );

    const invalidToken = {
      id: 'test',
      type: 'access',
      tokenType: 'serverAdmin',
      accountType: 'random',
    };
    tokenMap.invalid = jwt.sign(
      invalidToken,
      testEnv.testConfig.jwt.secretKey,
      {
        algorithm: 'HS512',
        expiresIn: '60m',
      }
    );
  });

  afterEach(async () => {
    await testEnv.stop();
  });

  test('Fail - No ServerToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request with no serverToken
    const response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .send({forceUpdate: true});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthenticated');
  });

  test('Fail - Invalid ServerToken', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request with refresh token instead of serverAdminToken
    let response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .set({
        'X-SERVER-TOKEN': tokenMap.refresh,
      })
      .send({forceUpdate: true});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Request with wrong serverToken
    response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .set({
        'X-SERVER-TOKEN': 'test',
      })
      .send({forceUpdate: true});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');

    // Request with invalid serverToken
    response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .set({
        'X-SERVER-TOKEN': tokenMap.invalid,
      })
      .send({forceUpdate: true});
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });

  test('Fail - Request with wrong body', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Request with no body
    let response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .set({
        'X-SERVER-TOKEN': tokenMap.admin,
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Request with additional body
    response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .set({
        'X-SERVER-TOKEN': tokenMap.admin,
      })
      .send({forceUpdate: true, test: 'test'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');

    // Request with only additional body
    response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .set({
        'X-SERVER-TOKEN': tokenMap.admin,
      })
      .send({test: 'test'});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
  });

  test('Fail - No ForceUpdate and Has not passed 12 hours', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create courseListMetaData in the database that has not passed 12 hours
    const lastChecked = new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString();
    const courseList = new CourseListMetaData(
      '1234',
      TestConfig.hash('1234', '1234', JSON.stringify("test")),
      lastChecked
    );
    await testEnv.dbClient.container('courseListMetaData').items.create(courseList);

    // Request with no forceUpdate
    const response = await request(testEnv.expressServer.app)
      .post('/schedule/course-list/1244/update')
      .set({
        'X-SERVER-TOKEN': tokenMap.admin,
      })
      .send({forceUpdate: false});
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Conflict');

    // Check if the courseList is updated
    const dbOps = await testEnv.dbClient
      .container('courseListMetaData')
      .item('1234')
      .read();
    expect(dbOps.resource.lastChecked).toEqual(lastChecked);
    expect(dbOps.resource.hash).toEqual(courseList.hash);
  });

  test('Success - No ForceUpdate and Has passed 12 hours with change', async () => {
    testEnv.expressServer = testEnv.expressServer as ExpressServer;
    testEnv.dbClient = testEnv.dbClient as Cosmos.Database;

    // Create courseListMetaData in the database that has passed 12 hours
    const lastChecked = new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString();
        
  });

  test('Success - ForceUpdate', async () => {
  });

  test('Success - No Previous CourseListMetaData', async () => {
  });

  test('Success - No change', async () => {
  });
});
