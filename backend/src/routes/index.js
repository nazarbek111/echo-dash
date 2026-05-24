import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/error.js'
import { requireAuth } from '../middleware/auth.js'
import * as auth from '../controllers/authController.js'
import * as runs from '../controllers/runController.js'
import * as lb from '../controllers/leaderboardController.js'
import * as skins from '../controllers/skinController.js'
import * as ach from '../controllers/achievementController.js'
import * as save from '../controllers/saveController.js'
import * as replays from '../controllers/replayController.js'
import * as daily from '../controllers/dailyController.js'
import * as analytics from '../controllers/analyticsController.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' }
})

// Auth
router.post('/auth/register', authLimiter, asyncHandler(auth.register))
router.post('/auth/login',    authLimiter, asyncHandler(auth.login))
router.post('/auth/logout',                asyncHandler(auth.logout))
router.get ('/auth/me',       requireAuth, asyncHandler(auth.me))

// User
router.get  ('/users/me',                 requireAuth, asyncHandler(auth.me))
router.patch('/users/me',                 requireAuth, asyncHandler(auth.updateMe))
router.get  ('/users/me/runs',            requireAuth, asyncHandler(runs.myRuns))
router.get  ('/users/me/analytics',       requireAuth, asyncHandler(analytics.myAnalytics))
router.get  ('/users/me/achievements',    requireAuth, asyncHandler(ach.myAchievements))
router.post ('/users/me/achievements/unlock', requireAuth, asyncHandler(ach.unlockAchievement))
router.get  ('/users/me/skins',           requireAuth, asyncHandler(skins.mySkins))
router.post ('/users/me/skins/unlock',    requireAuth, asyncHandler(skins.unlockSkin))
router.patch('/users/me/selected-skin',   requireAuth, asyncHandler(skins.selectSkin))

// Save
router.get ('/save',            requireAuth, asyncHandler(save.getSave))
router.put ('/save',            requireAuth, asyncHandler(save.putSave))
router.post('/save/sync-local', requireAuth, asyncHandler(save.syncLocal))

// Runs
router.post('/runs', requireAuth, asyncHandler(runs.submitRun))

// Leaderboard
router.get('/leaderboard', asyncHandler(lb.leaderboard))

// Skins / Achievements (public catalog)
router.get('/skins',        asyncHandler(skins.listSkins))
router.get('/achievements', asyncHandler(ach.listAchievements))

// Replays
router.get ('/replays/me/best', requireAuth, asyncHandler(replays.myBestReplay))
router.get ('/replays/top',                 asyncHandler(replays.topReplay))
router.get ('/replays/:id',                 asyncHandler(replays.getReplay))

// Daily
router.get ('/daily',             asyncHandler(daily.todaysDaily))
router.post('/daily/runs',        requireAuth, asyncHandler(daily.submitDailyRun))
router.get ('/daily/leaderboard', asyncHandler(daily.dailyLeaderboard))

export default router
