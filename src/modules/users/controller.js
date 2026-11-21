const { listTeam, createTeam, changeTeamAccess } = require('./service');

async function list(req, res, next) {
  try {
    const data = await listTeam();
    return res.status(200).json({ success: true, message: 'Team accounts retrieved', data });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = await createTeam(req.validated.body);
    return res.status(201).json({ success: true, message: 'Team account created', data });
  } catch (error) {
    return next(error);
  }
}

async function updateAccess(req, res, next) {
  try {
    const data = await changeTeamAccess(req.validated.params.id, req.validated.body);
    return res.status(200).json({ success: true, message: 'Team account updated', data });
  } catch (error) {
    return next(error);
  }
}

module.exports = { list, create, updateAccess };
