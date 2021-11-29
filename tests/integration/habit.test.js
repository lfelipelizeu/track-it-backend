import '../../src/setup.js';
import supertest from 'supertest';
import faker from 'faker';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import connection from '../../src/database.js';
import createHabit from '../factories/habitFactory.js';
import createUser from '../factories/userFactory.js';

const agent = supertest(app);

describe('POST /habits', () => {
    const user = createUser();
    const token = faker.datatype.uuid();

    beforeAll(async () => {
        const hashPassword = bcrypt.hashSync(user.password, 10);
        const result = await connection.query('INSERT INTO users (name, email, image,password) VALUES ($1, $2, $3, $4) RETURNING *;', [user.name, user.email, user.image, hashPassword]);
        user.id = result.rows[0].id;
        await connection.query('INSERT INTO sessions (user_id, token) VALUES ($1, $2);', [user.id, token]);
    });

    afterAll(async () => {
        await connection.query('DELETE FROM days_habits;');
        await connection.query('DELETE FROM habits;');
        await connection.query('DELETE FROM sessions;');
        await connection.query('DELETE FROM users;');
    });

    it('returns 401 for no token received', async () => {
        const body = createHabit();

        const result = await agent.post('/habits').send(body);
        expect(result.status).toEqual(401);
    });

    it('returns 401 for invalid session token', async () => {
        const invalidToken = faker.datatype.uuid();
        const body = createHabit();

        const result = await agent.post('/habits').send(body).set('authorization', invalidToken);
        expect(result.status).toEqual(401);
    });

    it('returns 400 for invalid habit', async () => {
        const body = {
            days: [],
        };

        const result = await agent.post('/habits').send(body).set('authorization', token);
        expect(result.status).toEqual(400);
    });

    it('returns 201 for valid habit', async () => {
        const body = createHabit();

        const result = await agent.post('/habits').send(body).set('authorization', token);
        expect(result.status).toEqual(201);
    });
});

describe('GET /habits', () => {
    const user = createUser();
    const token = faker.datatype.uuid();

    beforeAll(async () => {
        const hashPassword = bcrypt.hashSync(user.password, 10);
        const result = await connection.query('INSERT INTO users (name, email, image,password) VALUES ($1, $2, $3, $4) RETURNING *;', [user.name, user.email, user.image, hashPassword]);
        user.id = result.rows[0].id;
        await connection.query('INSERT INTO sessions (user_id, token) VALUES ($1, $2);', [user.id, token]);
    });

    afterAll(async () => {
        await connection.query('DELETE FROM days_habits;');
        await connection.query('DELETE FROM habits;');
        await connection.query('DELETE FROM sessions;');
        await connection.query('DELETE FROM users;');
    });

    it('returns 401 for no token received', async () => {
        const result = await agent.get('/habits');
        expect(result.status).toEqual(401);
    });

    it('returns 401 for invalid session token', async () => {
        const invalidToken = faker.datatype.uuid();

        const result = await agent.get('/habits').set('authorization', invalidToken);
        expect(result.status).toEqual(401);
    });

    it('returns 200 for valid session', async () => {
        const result = await agent.get('/habits').set('authorization', token);
        expect(result.status).toEqual(200);
    });
});

describe('DELETE /habits/:id', () => {
    const user = createUser();
    const token = faker.datatype.uuid();
    let habit;

    beforeAll(async () => {
        const hashPassword = bcrypt.hashSync(user.password, 10);
        const result = await connection.query('INSERT INTO users (name, email, image,password) VALUES ($1, $2, $3, $4) RETURNING *;', [user.name, user.email, user.image, hashPassword]);
        user.id = result.rows[0].id;
        await connection.query('INSERT INTO sessions (user_id, token) VALUES ($1, $2);', [user.id, token]);
        const newHabit = createHabit();
        const result2 = await connection.query('INSERT INTO habits (user_id, name, weekdays, current_sequence, highest_sequence) VALUES ($1, $2, $3, 0, 0) RETURNING *;', [user.id, newHabit.name, JSON.stringify(newHabit.days)]);
        // eslint-disable-next-line prefer-destructuring
        habit = result2.rows[0];
    });

    afterAll(async () => {
        await connection.query('DELETE FROM days_habits;');
        await connection.query('DELETE FROM habits;');
        await connection.query('DELETE FROM sessions;');
        await connection.query('DELETE FROM users;');
    });

    it('returns 400 for a string at the param', async () => {
        const result = await agent.delete(`/habits/${faker.lorem.word(5)}`).set('authorization', token);
        expect(result.status).toEqual(400);
    });

    it('returns 401 for no token received', async () => {
        const result = await agent.delete(`/habits/${habit.id}`);
        expect(result.status).toEqual(401);
    });

    it('returns 401 for invalid session token', async () => {
        const invalidToken = faker.datatype.uuid();

        const result = await agent.delete(`/habits/${habit.id}`).set('authorization', invalidToken);
        expect(result.status).toEqual(401);
    });

    it('returns 404 for invalid habit id', async () => {
        const invalidHabit = faker.datatype.number();

        const result = await agent.delete(`/habits/${invalidHabit}`).set('authorization', token);
        expect(result.status).toEqual(404);
    });

    it('returns 200 for valid habit', async () => {
        const result = await agent.delete(`/habits/${habit.id}`).set('authorization', token);
        expect(result.status).toEqual(200);
    });
});

describe('GET /today', () => {
    const user = createUser();
    const token = faker.datatype.uuid();

    beforeAll(async () => {
        const hashPassword = bcrypt.hashSync(user.password, 10);
        const result = await connection.query('INSERT INTO users (name, email, image,password) VALUES ($1, $2, $3, $4) RETURNING *;', [user.name, user.email, user.image, hashPassword]);
        user.id = result.rows[0].id;
        await connection.query('INSERT INTO sessions (user_id, token) VALUES ($1, $2);', [user.id, token]);
        const newHabit = createHabit();
        await agent.post('/habits').send(newHabit).set('authorization', token);
    });

    afterAll(async () => {
        await connection.query('DELETE FROM days_habits;');
        await connection.query('DELETE FROM habits;');
        await connection.query('DELETE FROM sessions;');
        await connection.query('DELETE FROM users;');
    });

    it('returns 401 for no token received', async () => {
        const result = await agent.get('/today');
        expect(result.status).toEqual(401);
    });

    it('returns 401 for invalid session token', async () => {
        const invalidToken = faker.datatype.uuid();

        const result = await agent.get('/today').set('authorization', invalidToken);
        expect(result.status).toEqual(401);
    });

    it('returns 200 for valid session', async () => {
        const result = await agent.get('/today').set('authorization', token);
        expect(result.status).toEqual(200);
    });
});
