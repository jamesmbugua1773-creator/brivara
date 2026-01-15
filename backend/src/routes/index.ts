import { Router } from 'express';
import auth from './modules/auth.js';
import dashboard from './modules/dashboard.js';
import earnings from './modules/earnings.js';
import wallet from './modules/wallet.js';
import referrals from './modules/referrals.js';
import packages from './modules/packages.js';
import progress from './modules/progress.js';
import awards from './modules/awards.js';
import profile from './modules/profile.js';
import admin from './modules/admin.js';
import support from './modules/support.js';
import funding from './modules/funding.js';

const router = Router();

router.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

router.use('/auth', auth);
router.use('/dashboard', dashboard);
router.use('/earnings', earnings);
router.use('/wallet', wallet);
router.use('/referrals', referrals);
router.use('/packages', packages);
router.use('/progress', progress);
router.use('/awards', awards);
router.use('/profile', profile);
router.use('/funding', funding);
router.use('/admin', admin);
router.use('/support', support);

export default router;
