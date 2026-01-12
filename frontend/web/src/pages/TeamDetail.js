import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    InputAdornment,
    Menu,
    MenuItem,
    Chip,
    Tabs,
    Tab,
    Avatar,
    Divider,
    Select,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Key as KeyIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    ArrowBack as ArrowBackIcon,
    PersonAdd as PersonAddIcon,
    Person as PersonIcon,
    Settings as SettingsIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useKeyStore } from '../context/KeyStoreContext';
import {
    handleGetTeamById,
    handleLoadTeamKey,
    handleAddMemberToTeam,
    handleRemoveMemberFromTeam,
    handleDeleteTeam,
    handleGetTeamMembers,
} from '../flows/teamFlow';
import {
    handleCreateTeamItem,
    handleGetAllTeamItems,
    handleUpdateTeamItem,
    handleDeleteTeamItem,
} from '../flows/itemFlow';

const secretTypes = ['password', 'api_key', 'note', 'credential', 'other'];

const TeamDetail = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { getTeamKey, setTeamKey } = useKeyStore();

    // Team data
    const [team, setTeam] = useState(null);
    const [teamItems, setTeamItems] = useState([]);
    const [teamMembersList, setTeamMembersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI state
    const [tabIndex, setTabIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleSecrets, setVisibleSecrets] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [saving, setSaving] = useState(false);

    // Dialog states
    const [secretDialogOpen, setSecretDialogOpen] = useState(false);
    const [memberDialogOpen, setMemberDialogOpen] = useState(false);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [secretFormData, setSecretFormData] = useState({
        name: '',
        type: 'password',
        username: '',
        secret: '',
        url: '',
        notes: '',
    });

    const [memberEmail, setMemberEmail] = useState('');
    const [memberRole, setMemberRole] = useState('member');
    const [memberError, setMemberError] = useState('');
    const [teamFormData, setTeamFormData] = useState({ name: '', description: '' });

    // Load team data
    const loadTeamData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Load team info
            const teamData = await handleGetTeamById(teamId);
            if (!teamData) {
                setError('Team not found');
                return;
            }
            setTeam(teamData);
            setTeamFormData({ name: teamData.name, description: teamData.description || '' });

            // Load team members
            const members = await handleGetTeamMembers(teamId);
            setTeamMembersList(members || []);

            // Load and decrypt team key
            let teamKeyBytes = getTeamKey(teamId);
            if (!teamKeyBytes) {
                const keyResult = await handleLoadTeamKey(teamId);
                teamKeyBytes = keyResult.teamKeyBytes;
                setTeamKey(teamId, teamKeyBytes);
            }

            // Load and decrypt team items
            const items = await handleGetAllTeamItems({
                teamId,
                teamKeyBytes,
            });
            setTeamItems(items || []);
        } catch (err) {
            setError('Failed to load team: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [teamId, getTeamKey, setTeamKey]);

    useEffect(() => {
        loadTeamData();
    }, [loadTeamData]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!team) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                    {error || 'Team not found'}
                </Typography>
                <Button sx={{ mt: 2 }} onClick={() => navigate('/teams')}>
                    Back to Teams
                </Button>
            </Box>
        );
    }

    const isOwner = team.createdBy === currentUser?.id;
    const currentMember = teamMembersList.find(m => m.userId === currentUser?.id);
    const canManageMembers = isOwner || currentMember?.role === 'admin';

    const filteredItems = teamItems.filter(item => {
        const name = item.decryptedData?.name || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Secret handlers
    const handleOpenSecretDialog = (item = null) => {
        if (item) {
            const data = item.decryptedData || {};
            setEditingItem(item);
            setSecretFormData({
                name: data.name || '',
                type: data.type || 'password',
                username: data.username || '',
                secret: data.secret || '',
                url: data.url || '',
                notes: data.notes || '',
            });
        } else {
            setEditingItem(null);
            setSecretFormData({
                name: '',
                type: 'password',
                username: '',
                secret: '',
                url: '',
                notes: '',
            });
        }
        setSecretDialogOpen(true);
    };

    const handleSubmitSecret = async () => {
        setSaving(true);
        setError('');

        try {
            const teamKeyBytes = getTeamKey(teamId);
            if (!teamKeyBytes) {
                throw new Error('Team key not loaded');
            }

            const secretData = {
                name: secretFormData.name,
                type: secretFormData.type,
                username: secretFormData.username,
                secret: secretFormData.secret,
                url: secretFormData.url,
                notes: secretFormData.notes,
            };

            if (editingItem) {
                await handleUpdateTeamItem({
                    teamId,
                    itemId: editingItem.id,
                    newSecret: secretData,
                    teamKeyBytes,
                    keyVersion: editingItem.keyVersion || 1,
                });
            } else {
                await handleCreateTeamItem({
                    teamId,
                    secret: secretData,
                    teamKeyBytes,
                    keyVersion: 1,
                });
            }

            setSecretDialogOpen(false);
            await loadTeamData();
        } catch (err) {
            setError('Failed to save secret: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleVisibility = (itemId) => {
        setVisibleSecrets(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const handleMenuOpen = (event, item) => {
        setAnchorEl(event.currentTarget);
        setSelectedItem(item);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedItem(null);
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        handleMenuClose();
    };

    const handleDeleteSecret = async () => {
        if (!selectedItem) return;

        try {
            await handleDeleteTeamItem(teamId, selectedItem.id);
            await loadTeamData();
        } catch (err) {
            setError('Failed to delete: ' + err.message);
        }
        handleMenuClose();
    };

    // Member handlers
    const handleAddMember = async () => {
        setMemberError('');
        setSaving(true);

        try {
            const result = await handleAddMemberToTeam(teamId, memberEmail);

            setMemberEmail('');
            setMemberRole('member');
            setMemberDialogOpen(false);
            await loadTeamData();
        } catch (err) {
            setMemberError(err.message || 'Failed to add member');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenMemberDialog = () => {
        setMemberEmail('');
        setMemberRole('member');
        setMemberError('');
        setMemberDialogOpen(true);
    };

    const handleRemoveMember = async (userId) => {
        try {
            await handleRemoveMemberFromTeam(teamId, userId);
            await loadTeamData();
        } catch (err) {
            setError('Failed to remove member: ' + err.message);
        }
    };

    // Settings handlers
    const handleOpenSettings = () => {
        setTeamFormData({ name: team.name, description: team.description || '' });
        setSettingsDialogOpen(true);
    };

    const handleUpdateTeam = async () => {
        // Would need updateTeam flow
        setSettingsDialogOpen(false);
    };

    const handleDeleteTeamAction = async () => {
        try {
            await handleDeleteTeam(teamId);
            navigate('/teams');
        } catch (err) {
            setError('Failed to delete team: ' + err.message);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/teams')}>
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight="bold">
                        {team.name}
                    </Typography>
                    {team.description && (
                        <Typography color="text.secondary" variant="body2">
                            {team.description}
                        </Typography>
                    )}
                </Box>
                {canManageMembers && (
                    <IconButton onClick={handleOpenSettings}>
                        <SettingsIcon />
                    </IconButton>
                )}
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Tabs */}
            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3 }}>
                <Tab label={`Secrets (${teamItems.length})`} />
                <Tab label={`Members (${teamMembersList.length})`} />
            </Tabs>

            {/* Secrets Tab */}
            {tabIndex === 0 && (
                <>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="Search secrets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenSecretDialog()}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            Add Secret
                        </Button>
                    </Box>

                    {filteredItems.length === 0 ? (
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 8 }}>
                                <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    {searchQuery ? 'No secrets found' : 'No team secrets yet'}
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    sx={{ mt: 2 }}
                                    onClick={() => handleOpenSecretDialog()}
                                >
                                    Add Secret
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <List disablePadding>
                                {filteredItems.map((item, index) => {
                                    const data = item.decryptedData || {};
                                    const name = data.name || 'Unnamed';
                                    const type = data.type || 'other';
                                    const secret = data.secret || '';

                                    return (
                                        <ListItem key={item.id} divider={index < filteredItems.length - 1} sx={{ py: 2 }}>
                                            <ListItemIcon>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 1,
                                                        bgcolor: 'secondary.main',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <KeyIcon sx={{ color: 'white' }} />
                                                </Box>
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {name}
                                                        <Chip size="small" label={type} />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                                        {visibleSecrets[item.id] ? secret : '••••••••••••'}
                                                    </Typography>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton onClick={() => handleToggleVisibility(item.id)} size="small">
                                                    {visibleSecrets[item.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                </IconButton>
                                                <IconButton onClick={() => handleCopy(secret)} size="small">
                                                    <CopyIcon />
                                                </IconButton>
                                                <IconButton onClick={(e) => handleMenuOpen(e, item)} size="small">
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Card>
                    )}
                </>
            )}

            {/* Members Tab */}
            {tabIndex === 1 && (
                <>
                    {canManageMembers && (
                        <Box sx={{ mb: 3 }}>
                            <Button
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={handleOpenMemberDialog}
                            >
                                Add Member
                            </Button>
                        </Box>
                    )}
                    <Card>
                        <List disablePadding>
                            {teamMembersList.map((member, index) => {
                                const memberUser = member.user;
                                const isSelf = member.userId === currentUser?.id;
                                const isTeamOwner = member.userId === team.createdBy;

                                return (
                                    <ListItem
                                        key={member.userId}
                                        divider={index < teamMembersList.length - 1}
                                    >
                                        <ListItemIcon>
                                            <Avatar sx={{ bgcolor: isTeamOwner ? 'primary.main' : 'grey.600' }}>
                                                <PersonIcon />
                                            </Avatar>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {memberUser?.username || member.userId}
                                                    {isSelf && <Chip size="small" label="You" variant="outlined" />}
                                                </Box>
                                            }
                                            secondary={memberUser?.email || ''}
                                        />
                                        <Chip
                                            label={isTeamOwner ? 'Owner' : member.role}
                                            color={isTeamOwner ? 'primary' : member.role === 'admin' ? 'secondary' : 'default'}
                                            size="small"
                                        />
                                        {canManageMembers && !isTeamOwner && !isSelf && (
                                            <IconButton
                                                onClick={() => handleRemoveMember(member.userId)}
                                                size="small"
                                                sx={{ ml: 1 }}
                                            >
                                                <DeleteIcon fontSize="small" color="error" />
                                            </IconButton>
                                        )}
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Card>
                </>
            )}

            {/* Context Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={() => { handleOpenSecretDialog(selectedItem); handleMenuClose(); }}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
                <MenuItem onClick={() => handleCopy(selectedItem?.decryptedData?.secret || '')}>
                    <CopyIcon fontSize="small" sx={{ mr: 1 }} /> Copy
                </MenuItem>
                <MenuItem onClick={handleDeleteSecret} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
            </Menu>

            {/* Add/Edit Secret Dialog */}
            <Dialog open={secretDialogOpen} onClose={() => setSecretDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingItem ? 'Edit Secret' : 'Add New Secret'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Name"
                            value={secretFormData.name}
                            onChange={(e) => setSecretFormData({ ...secretFormData, name: e.target.value })}
                            required
                        />
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={secretFormData.type}
                                label="Type"
                                onChange={(e) => setSecretFormData({ ...secretFormData, type: e.target.value })}
                            >
                                {secretTypes.map(type => (
                                    <MenuItem key={type} value={type}>{type.replace('_', ' ')}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Username (optional)"
                            value={secretFormData.username}
                            onChange={(e) => setSecretFormData({ ...secretFormData, username: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Secret"
                            value={secretFormData.secret}
                            onChange={(e) => setSecretFormData({ ...secretFormData, secret: e.target.value })}
                            type="password"
                            required
                        />
                        <TextField
                            fullWidth
                            label="URL (optional)"
                            value={secretFormData.url}
                            onChange={(e) => setSecretFormData({ ...secretFormData, url: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Notes (optional)"
                            value={secretFormData.notes}
                            onChange={(e) => setSecretFormData({ ...secretFormData, notes: e.target.value })}
                            multiline
                            rows={2}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSecretDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitSecret}
                        disabled={!secretFormData.name || !secretFormData.secret || saving}
                    >
                        {saving ? <CircularProgress size={20} /> : (editingItem ? 'Save' : 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Member Dialog */}
            <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
                        Enter the email address of a registered user to add them to the team.
                    </Alert>
                    {memberError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {memberError}
                        </Alert>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={memberEmail}
                            onChange={(e) => { setMemberEmail(e.target.value); setMemberError(''); }}
                            placeholder="user@example.com"
                            helperText="Enter the email of the user to add"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={memberRole}
                                label="Role"
                                onChange={(e) => setMemberRole(e.target.value)}
                            >
                                <MenuItem value="member">Member - Can view and add secrets</MenuItem>
                                <MenuItem value="admin">Admin - Can also manage members</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddMember} disabled={!memberEmail || saving}>
                        {saving ? <CircularProgress size={20} /> : 'Add Member'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Team Settings Dialog */}
            <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Team Settings</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Team Name"
                            value={teamFormData.name}
                            onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            value={teamFormData.description}
                            onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                            multiline
                            rows={3}
                        />
                    </Box>
                    {isOwner && (
                        <>
                            <Divider sx={{ my: 3 }} />
                            <Typography color="error" gutterBottom fontWeight="bold">
                                Danger Zone
                            </Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={handleDeleteTeamAction}
                                startIcon={<DeleteIcon />}
                            >
                                Delete Team
                            </Button>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateTeam}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamDetail;
