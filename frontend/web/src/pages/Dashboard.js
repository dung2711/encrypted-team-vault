import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    IconButton,
    CircularProgress,
} from '@mui/material';
import {
    Lock as LockIcon,
    Group as GroupIcon,
    Add as AddIcon,
    Key as KeyIcon,
    ArrowForward as ArrowForwardIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { handleGetTeams, handleGetTeamMembers } from '../flows/teamFlow';
import { handleGetAllPersonalItems } from '../flows/itemFlow';

const Dashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [personalItems, setPersonalItems] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamMembersMap, setTeamMembersMap] = useState({});

    const loadData = useCallback(async () => {
        if (!currentUser?.id) return;

        setLoading(true);
        try {
            // Load personal items
            const items = await handleGetAllPersonalItems({ userId: currentUser.id });
            setPersonalItems(items || []);

            // Load teams
            const teamsData = await handleGetTeams();
            setTeams(teamsData || []);

            // Load member info for each team
            const membersMap = {};
            for (const team of teamsData || []) {
                try {
                    membersMap[team.id] = await handleGetTeamMembers(team.id);
                } catch (e) {
                    membersMap[team.id] = [];
                }
            }
            setTeamMembersMap(membersMap);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    // Calculate total team items (would need to load from each team)
    const totalTeamItems = 0; // Simplified - would need to track this

    const stats = [
        {
            title: 'Personal Secrets',
            value: personalItems.length,
            icon: <LockIcon />,
            color: '#6366f1',
            path: '/vault',
        },
        {
            title: 'Teams',
            value: teams.length,
            icon: <GroupIcon />,
            color: '#10b981',
            path: '/teams',
        },
        {
            title: 'Team Secrets',
            value: totalTeamItems,
            icon: <KeyIcon />,
            color: '#f59e0b',
            path: '/teams',
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Welcome back, {currentUser?.username || 'User'}!
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Your encrypted vault overview
                    </Typography>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.map((stat) => (
                    <Grid item xs={12} sm={4} key={stat.title}>
                        <Card
                            sx={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'translateY(-4px)' },
                            }}
                            onClick={() => navigate(stat.path)}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography color="text.secondary" variant="body2">
                                            {stat.title}
                                        </Typography>
                                        <Typography variant="h3" fontWeight="bold" sx={{ mt: 1 }}>
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 2,
                                            bgcolor: `${stat.color}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: stat.color,
                                        }}
                                    >
                                        {stat.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Recent Personal Secrets */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight="bold">
                                    Recent Secrets
                                </Typography>
                                <Button
                                    size="small"
                                    endIcon={<ArrowForwardIcon />}
                                    onClick={() => navigate('/vault')}
                                >
                                    View All
                                </Button>
                            </Box>
                            {personalItems.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <LockIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                    <Typography color="text.secondary">
                                        No secrets yet
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        sx={{ mt: 2 }}
                                        onClick={() => navigate('/vault')}
                                    >
                                        Add Secret
                                    </Button>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {personalItems.slice(0, 5).map((item) => {
                                        const data = item.decryptedData || {};
                                        return (
                                            <ListItem
                                                key={item.id}
                                                secondaryAction={
                                                    <IconButton edge="end" size="small">
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                }
                                                sx={{
                                                    bgcolor: 'background.default',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <KeyIcon color="primary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={data.name || 'Unnamed'}
                                                    secondary={data.type || 'other'}
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Teams Overview */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight="bold">
                                    Your Teams
                                </Typography>
                                <Button
                                    size="small"
                                    endIcon={<ArrowForwardIcon />}
                                    onClick={() => navigate('/teams')}
                                >
                                    View All
                                </Button>
                            </Box>
                            {teams.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                    <Typography color="text.secondary">
                                        No teams yet
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        sx={{ mt: 2 }}
                                        onClick={() => navigate('/teams')}
                                    >
                                        Create Team
                                    </Button>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {teams.slice(0, 5).map((team) => {
                                        const members = teamMembersMap[team.id] || [];
                                        const myMembership = members.find(m => m.userId === currentUser?.id);
                                        return (
                                            <ListItem
                                                key={team.id}
                                                sx={{
                                                    bgcolor: 'background.default',
                                                    borderRadius: 1,
                                                    mb: 1,
                                                    cursor: 'pointer',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }}
                                                onClick={() => navigate(`/teams/${team.id}`)}
                                            >
                                                <ListItemIcon>
                                                    <GroupIcon color="secondary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={team.name}
                                                    secondary={`${members.length} member${members.length !== 1 ? 's' : ''}`}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={team.createdBy === currentUser?.id ? 'Owner' : myMembership?.role || 'member'}
                                                    color={team.createdBy === currentUser?.id ? 'primary' : 'default'}
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
