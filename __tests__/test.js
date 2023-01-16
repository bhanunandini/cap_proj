/* eslint-disable no-undef */
const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function fetchCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let response = await agent.get("/login");
  let csrfToken = fetchCsrfToken(response);
  response = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Online Election suite", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Test Sign up functinality", async () => {
    let response = await agent.get("/signup");
    const csrfToken = fetchCsrfToken(response);
    response = await agent.post("/admin").send({
      firstName: "Sovit",
      lastName: "chy",
      email: "user.a@gmail.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Test Sign in functionality", async () => {
    const agent = request.agent(server);
    let response = await agent.get("/elections");
    expect(response.statusCode).toBe(302);
    await login(agent, "user.a@gmail.com", "12345678");
    response = await agent.get("/elections");
    expect(response.statusCode).toBe(200);
  });

  test("Test Sign out functionality", async () => {
    let response = await agent.get("/elections");
    expect(response.statusCode).toBe(200);
    response = await agent.get("/signout");
    expect(response.statusCode).toBe(302);
    response = await agent.get("/elections");
    expect(response.statusCode).toBe(302);
  });

  test("Test Creating a election", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    const getResponse = await agent.get("/elections/create");
    const csrfToken = fetchCsrfToken(getResponse);
    const response = await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test1",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("test Adding functionality of question", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let getResponse = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(getResponse);
    await agent.post("/elections").send({
      electionName: "Test question",
      urlString: "test2",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent
      .get("/elections")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedResponse.elections.length;
    const latestElection = parsedGroupedResponse.elections[electionCount - 1];
    getResponse = await agent.get(`/elections/${latestElection.id}/questions/create`);
    csrfToken = fetchCsrfToken(getResponse);
    let response = await agent.post(`/elections/${latestElection.id}/questions/create`).send({
        question: "question",
        description: "description",
        _csrf: csrfToken,
      });
    expect(response.statusCode).toBe(302);
  });

  test("test Deleting functionality of question", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let response = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(response);
    await agent.post("/elections").send({
      electionName: "Test question",
      urlString: "test3",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedElectionsResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedElectionsResponse.elections.length;
    const latestElection = parsedGroupedElectionsResponse.elections[electionCount - 1];
    response = await agent.get(`/elections/${latestElection.id}/questions/create`);
    csrfToken = fetchCsrfToken(response);
    await agent.post(`/elections/${latestElection.id}/questions/create`).send({
      question: "question",
      description: "description",
      _csrf: csrfToken,
    });
    response = await agent.get(`/elections/${latestElection.id}/questions/create`);
    csrfToken = fetchCsrfToken(response);
    await agent.post(`/elections/${latestElection.id}/questions/create`).send({
      question: "Test question 2",
      description: "Test description 2",
      _csrf: csrfToken,
    });
    const groupedQuestionsResponse = await agent.get(`/elections/${latestElection.id}/questions`).set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(groupedQuestionsResponse.text);
    const questionCount = parsedQuestionsGroupedResponse.questions.length;
    const latestQuestion = parsedQuestionsGroupedResponse.questions[questionCount - 1];
    response = await agent.get(`/elections/${latestElection.id}/questions`);
    csrfToken = fetchCsrfToken(response);
    const deleteResponse = await agent.delete(`/elections/${latestElection.id}/questions/${latestQuestion.id}`).send({
      _csrf: csrfToken,
    });
    const parsedDeleteResponse = JSON.parse(deleteResponse.text).success;
    expect(parsedDeleteResponse).toBe(true);
    response = await agent.get(`/elections/${latestElection.id}/questions`);
    csrfToken = fetchCsrfToken(response);

    const deleteResponse2 = await agent.delete(`/elections/${latestElection.id}/questions/${latestQuestion.id}`).send({
      _csrf: csrfToken,
    });
    const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(parsedDeleteResponse2).toBe(false);
  });

  test("test Updating functionality of question", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let res = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test4",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedElectionsResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedElectionsResponse.elections.length;
    const latestElection = parsedGroupedElectionsResponse.elections[electionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/create`);
    csrfToken = fetchCsrfToken(res);
    await agent.post(`/elections/${latestElection.id}/questions/create`).send({
      question: "Test question 4",
      description: "Test description 4",
      _csrf: csrfToken,
    });
    const groupedQuestionsResponse = await agent.get(`/elections/${latestElection.id}/questions`).set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(groupedQuestionsResponse.text);
    const questionCount = parsedQuestionsGroupedResponse.questions.length;
    const latestQuestion = parsedQuestionsGroupedResponse.questions[questionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/${latestQuestion.id}/edit`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.put(`/elections/${latestElection.id}/questions/${latestQuestion.id}/edit`).send({
        _csrf: csrfToken,
        question: "test question",
        description: "discription",
      });
    expect(res.statusCode).toBe(200);
  });

  test("test Adding functinality of option", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let res = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test5",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedResponse.elections.length;
    const latestElection = parsedGroupedResponse.elections[electionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/create`);
    csrfToken = fetchCsrfToken(res);
    await agent.post(`/elections/${latestElection.id}/questions/create`).send({
      question: "Test question",
      description: "Test description",
      _csrf: csrfToken,
    });

    const groupedQuestionsResponse = await agent.get(`/elections/${latestElection.id}/questions`).set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(groupedQuestionsResponse.text);
    const questionCount = parsedQuestionsGroupedResponse.questions.length;
    const latestQuestion = parsedQuestionsGroupedResponse.questions[questionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/questions/${latestQuestion.id}`).send({
        _csrf: csrfToken,
        option: "Test option",
      });
    expect(res.statusCode).toBe(302);
  });

  test("test Deleting functinality of option", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let res = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test6",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedElectionsResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedElectionsResponse.elections.length;
    const latestElection = parsedGroupedElectionsResponse.elections[electionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/create`);
    csrfToken = fetchCsrfToken(res);
    await agent.post(`/elections/${latestElection.id}/questions/create`).send({
      question: "Test question 1",
      description: "Test description 1",
      _csrf: csrfToken,
    });

    const groupedQuestionsResponse = await agent.get(`/elections/${latestElection.id}/questions`).set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(groupedQuestionsResponse.text);
    const questionCount = parsedQuestionsGroupedResponse.questions.length;
    const latestQuestion = parsedQuestionsGroupedResponse.questions[questionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/questions/${latestQuestion.id}`).send({
       _csrf: csrfToken,
      option: "Test option",
    });
    const groupedOptionsResponse = await agent
      .get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`)
      .set("Accept", "application/json");
    const parsedOptionsGroupedResponse = JSON.parse(groupedOptionsResponse.text);
    const optionsCount = parsedOptionsGroupedResponse.options.length;
    const latestOption = parsedOptionsGroupedResponse.options[optionsCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`);
    csrfToken = fetchCsrfToken(res);
    const deleteResponse = await agent.delete(`/elections/${latestElection.id}/questions/${latestQuestion.id}/options/${latestOption.id}`).send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse = JSON.parse(deleteResponse.text).success;
    expect(parsedDeleteResponse).toBe(true);
    res = await agent.get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`);
    csrfToken = fetchCsrfToken(res);

    const deleteResponse2 = await agent.delete(`/elections/${latestElection.id}/questions/${latestQuestion.id}/options/${latestOption.id}`).send({
      _csrf: csrfToken,
    });
    const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(parsedDeleteResponse2).toBe(false);
  });

  test("Test adding functionality of voter", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let res = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test8",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedResponse.elections.length;
    const latestElection = parsedGroupedResponse.elections[electionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/voters/create`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/voters/create`).send({
        voterid: "voter1",
        password: "Test password",
        _csrf: csrfToken,
      });
    expect(res.statusCode).toBe(302);
  });

  test("test Deleting functinality of voter", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let res = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test9",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedResponse.elections.length;
    const latestElection = parsedGroupedResponse.elections[electionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/voters/create`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/voters/create`).send({
      voterid: "sameer2003",
      password: "12345678",
      _csrf: csrfToken,
    });

    res = await agent.get(`/elections/${latestElection.id}/voters/create`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/voters/create`).send({
        voterid: "suraj2002",
        password: "87654321",
        _csrf: csrfToken,
      });

    const groupedVotersResponse = await agent.get(`/elections/${latestElection.id}/voters`).set("Accept", "application/json");
    const parsedVotersGroupedResponse = JSON.parse(groupedVotersResponse.text);
    const votersCount = parsedVotersGroupedResponse.voters.length;
    const latestVoter = parsedVotersGroupedResponse.voters[votersCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/voters/`);
    csrfToken = fetchCsrfToken(res);
    const deleteResponse = await agent
      .delete(`/elections/${latestElection.id}/voters/${latestVoter.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse = JSON.parse(deleteResponse.text).success;
    expect(parsedDeleteResponse).toBe(true);

    res = await agent.get(`/elections/${latestElection.id}/voters/`);
    csrfToken = fetchCsrfToken(res);
    const deleteResponse2 = await agent.delete(`/elections/${latestElection.id}/voters/${latestVoter.id}`).send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(parsedDeleteResponse2).toBe(false);
  });

  test("Test Preview and Launch validation", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let res = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test10",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedResponse.elections.length;
    const latestElection = parsedGroupedResponse.elections[electionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/preview`);
    csrfToken = fetchCsrfToken(res);
    expect(res.statusCode).toBe(302);
  });

  test("Test Launch an election", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@gmail.com", "12345678");
    let res = await agent.get("/elections/create");
    let csrfToken = fetchCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Test election",
      urlString: "test11",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent.get("/elections").set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const electionCount = parsedGroupedResponse.elections.length;
    const latestElection = parsedGroupedResponse.elections[electionCount - 1];

    res = await agent.get(`/elections/${latestElection.id}/questions/create`);
    csrfToken = fetchCsrfToken(res);
    await agent.post(`/elections/${latestElection.id}/questions/create`).send({
      question: "question",
      description: "description of question",
      _csrf: csrfToken,
    });

    const groupedQuestionsResponse = await agent.get(`/elections/${latestElection.id}/questions`).set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(groupedQuestionsResponse.text);
    const questionCount = parsedQuestionsGroupedResponse.questions.length;
    const latestQuestion = parsedQuestionsGroupedResponse.questions[questionCount - 1];
    res = await agent.get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/questions/${latestQuestion.id}`).send({
      _csrf: csrfToken,
      option: "Test option",
    });
    //adding option 2
    res = await agent.get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/questions/${latestQuestion.id}`).send({
      _csrf: csrfToken,
      option: "Test option",
    });

    //add a voter
    res = await agent.get(`/elections/${latestElection.id}/voters/create`);
    csrfToken = fetchCsrfToken(res);
    res = await agent.post(`/elections/${latestElection.id}/voters/create`).send({
      voterid: "sovit2000",
      password: "12345678",
      _csrf: csrfToken,
    });

    res = await agent.get(`/elections/${latestElection.id}/preview`);
    csrfToken = fetchCsrfToken(res);
    expect(latestElection.running).toBe(false);
    res = await agent.put(`/elections/${latestElection.id}/launch`).send({ _csrf: csrfToken, });
    const launchedElectionRes = JSON.parse(res.text);
    expect(launchedElectionRes[1][0].running).toBe(true);
  });
});