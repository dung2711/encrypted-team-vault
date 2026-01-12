import React, { useState, } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Avatar,
    CircularProgress,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { updateUserInfo } from '../services/userApi';
import { handleChangePassword } from '../flows/authFlow';

const Settings = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const [profileData, setProfileData] = useState({
        username: currentUser?.username || '',
        email: currentUser?.email || '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [saveSuccess, setSaveSuccess] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const handleSaveProfile = async () => {
        setSaving(true);
        setError('');
        try {
            await updateUserInfo(currentUser.id, profileData);
            setSaveSuccess('Profile updated successfully');
            setTimeout(() => setSaveSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePasswordSubmit = async () => {
        setError('');
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        if (passwordData.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setChangingPassword(true);
        try {
            await handleChangePassword({
                userId: currentUser.id,
                oldPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            setSaveSuccess('Password changed successfully. All your vault data has been re-encrypted.');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setSaveSuccess(''), 1000);
            setTimeout(async () => { await logout(); navigate('/login') }, 1500);
        } catch (err) {
            setError(err.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                Settings
            </Typography>

            {saveSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {saveSuccess}
                </Alert>
            )}

            {/* Profile Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <PersonIcon color="primary" />
                        <Typography variant="h6">Profile</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                        <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                            {currentUser?.username?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{currentUser?.username}</Typography>
                            <Typography color="text.secondary">{currentUser?.email}</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Username"
                            value={profileData.username}
                            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="contained" onClick={handleSaveProfile} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Profile'}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Security Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <LockIcon color="primary" />
                        <Typography variant="h6">Security</Typography>
                    </Box>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        Changing your password will re-encrypt all your vault data.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Current Password"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Confirm New Password"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                onClick={handleChangePasswordSubmit}
                                disabled={!passwordData.currentPassword || !passwordData.newPassword || changingPassword}
                            >
                                {changingPassword ? <CircularProgress size={20} /> : 'Change Password'}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <DeleteIcon color="error" />
                        <Typography variant="h6" color="error">
                            Danger Zone
                        </Typography>
                    </Box>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        Once you delete your account, there is no going back. All your data will be permanently removed.
                    </Typography>
                    <Button variant="outlined" color="error" startIcon={<DeleteIcon />}>
                        Delete Account
                    </Button>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Settings;
