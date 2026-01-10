import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    Chip,
    Avatar,
    AvatarGroup,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Group as GroupIcon,
    Key as KeyIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useKeyStore } from '../context/KeyStoreContext';
import {
    handleGetTeams,
    handleCreateTeam,
    handleGetTeamMembers,
} from '../flows/teamFlow';
import { handleGetAllTeamItems } from '../flows/itemFlow';

const TeamList = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { setTeamKey } = useKeyStore();
    const [teams, setTeams] = useState([]);
    const [teamStats, setTeamStats] = useState({}); // { teamId: { itemCount, members } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    // Load teams on mount
    const loadTeams = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const teamsData = await handleGetTeams();
            setTeams(teamsData || []);

            // Load stats for each team (members count, items count)
            const stats = {};
            for (const team of teamsData || []) {
                try {
                    const members = await handleGetTeamMembers(team.id);
                    stats[team.id] = {
                        members: members || [],
                        itemCount: 0, // Will be loaded when user enters team
                    };
                } catch (e) {
                    stats[team.id] = { members: [], itemCount: 0 };
                }
            }
            setTeamStats(stats);
        } catch (err) {
            setError('Failed to load teams: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateTeamSubmit = async () => {
        if (!formData.name.trim()) return;

        setCreating(true);
        setError('');
        try {
            // Use actual flow-based team creation which:
            // 1. Generates team key
            // 2. Encrypts for creator
            // 3. Calls backend API
            const { apiTeam, teamKeyBytes } = await handleCreateTeam(formData.name);

            // Cache team key
            setTeamKey(apiTeam.id, teamKeyBytes);

            setFormData({ name: '', description: '' });
            setDialogOpen(false);
            await loadTeams(); // Refresh list
        } catch (err) {
            setError('Failed to create team: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                    Teams
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setDialogOpen(true)}
                >
                    Create Team
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <TextField
                fullWidth
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon color="action" />
                        </InputAdornment>
                    ),
                }}
            />

            {filteredTeams.length === 0 ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 8 }}>
                        <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            {searchQuery ? 'No teams found' : 'No teams yet'}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 3 }}>
                            {searchQuery ? 'Try a different search term' : 'Create a team to share secrets with others'}
                        </Typography>
                        {!searchQuery && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setDialogOpen(true)}
                            >
                                Create Team
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {filteredTeams.map((team) => {
                        const stats = teamStats[team.id] || { members: [], itemCount: 0 };
                        const isOwner = team.createdBy === currentUser?.id;
                        const memberCount = stats.members.length;

                        return (
                            <Grid item xs={12} sm={6} md={4} key={team.id}>
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4,
                                        },
                                    }}
                                    onClick={() => navigate(`/teams/${team.id}`)}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 2,
                                                    bgcolor: 'secondary.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <GroupIcon sx={{ color: 'white' }} />
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={isOwner ? 'Owner' : 'Member'}
                                                color={isOwner ? 'primary' : 'default'}
                                            />
                                        </Box>
                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            {team.name}
                                        </Typography>
                                        {team.description && (
                                            <Typography
                                                color="text.secondary"
                                                variant="body2"
                                                sx={{
                                                    mb: 2,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                {team.description}
                                            </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <KeyIcon fontSize="small" color="action" />
                                                <Typography variant="body2" color="text.secondary">
                                                    {stats.itemCount} secret{stats.itemCount !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                                                    {stats.members.map((member, i) => (
                                                        <Avatar key={i} sx={{ bgcolor: 'primary.main' }}>
                                                            <PersonIcon sx={{ fontSize: 14 }} />
                                                        </Avatar>
                                                    ))}
                                                </AvatarGroup>
                                                <Typography variant="body2" color="text.secondary">
                                                    {memberCount}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Create Team Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Team Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Description (optional)"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateTeamSubmit}
                        disabled={!formData.name.trim() || creating}
                    >
                        {creating ? <CircularProgress size={20} /> : 'Create Team'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamList;
