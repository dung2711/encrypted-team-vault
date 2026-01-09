import React, { useState, useEffect, useCallback } from 'react';
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
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
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
    Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import {
    handleCreatePersonalItem,
    handleGetAllPersonalItems,
    handleUpdatePersonalItem,
    handleDeletePersonalItem,
} from '../../../flows/itemFlow';

const secretTypes = ['password', 'api_key', 'note', 'credit_card', 'other'];

const PersonalVault = () => {
    const { currentUser } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [visibleSecrets, setVisibleSecrets] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        type: 'password',
        username: '',
        secret: '',
        url: '',
        notes: '',
    });

    // Load items on mount
    const loadItems = useCallback(async () => {
        if (!currentUser?.id) return;

        setLoading(true);
        setError('');
        try {
            const decryptedItems = await handleGetAllPersonalItems({
                userId: currentUser.id,
            });
            setItems(decryptedItems);
        } catch (err) {
            setError('Failed to load items: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const filteredItems = items.filter(item => {
        const name = item.decryptedData?.name || item.name || '';
        const type = item.decryptedData?.type || item.type || '';
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            type.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const handleOpenDialog = (item = null) => {
        if (item) {
            const data = item.decryptedData || {};
            setEditingItem(item);
            setFormData({
                name: data.name || '',
                type: data.type || 'password',
                username: data.username || '',
                secret: data.secret || '',
                url: data.url || '',
                notes: data.notes || '',
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                type: 'password',
                username: '',
                secret: '',
                url: '',
                notes: '',
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError('');

        try {
            const secretData = {
                name: formData.name,
                type: formData.type,
                username: formData.username,
                secret: formData.secret,
                url: formData.url,
                notes: formData.notes,
            };

            if (editingItem) {
                await handleUpdatePersonalItem({
                    itemId: editingItem.id,
                    newSecret: secretData,
                    userId: currentUser.id,
                    keyVersion: editingItem.keyVersion || 1,
                });
            } else {
                await handleCreatePersonalItem({
                    secret: secretData,
                    userId: currentUser.id,
                    keyVersion: 1,
                });
            }

            handleCloseDialog();
            await loadItems(); // Refresh list
        } catch (err) {
            setError('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleVisibility = (itemId) => {
        setVisibleSecrets(prev => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
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

    const handleDelete = async () => {
        if (!selectedItem) return;

        try {
            await handleDeletePersonalItem(selectedItem.id);
            await loadItems();
        } catch (err) {
            setError('Failed to delete: ' + err.message);
        }
        handleMenuClose();
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
                    Personal Vault
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Secret
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <TextField
                fullWidth
                placeholder="Search secrets..."
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

            {filteredItems.length === 0 ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 8 }}>
                        <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            {searchQuery ? 'No secrets found' : 'Your vault is empty'}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 3 }}>
                            {searchQuery ? 'Try a different search term' : 'Add your first secret to get started'}
                        </Typography>
                        {!searchQuery && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenDialog()}
                            >
                                Add Secret
                            </Button>
                        )}
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
                            const username = data.username;
                            
                            return (
                                <ListItem
                                    key={item.id}
                                    divider={index < filteredItems.length - 1}
                                    sx={{ py: 2 }}
                                >
                                    <ListItemIcon>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 1,
                                                bgcolor: 'primary.main',
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
                                            <Box sx={{ mt: 1 }}>
                                                {username && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Username: {username}
                                                    </Typography>
                                                )}
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontFamily: 'monospace' }}
                                                >
                                                    {visibleSecrets[item.id]
                                                        ? secret || '[no secret]'
                                                        : '••••••••••••'}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            onClick={() => handleToggleVisibility(item.id)}
                                            size="small"
                                        >
                                            {visibleSecrets[item.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleCopy(secret)}
                                            size="small"
                                        >
                                            <CopyIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={(e) => handleMenuOpen(e, item)}
                                            size="small"
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            );
                        })}
                    </List>
                </Card>
            )}
                                    >
                                        {visibleSecrets[item.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                    <IconButton
                                        onClick={() => handleCopy(item.decryptedSecret || '')}
                                        size="small"
                                    >
                                        <CopyIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={(e) => handleMenuOpen(e, item)}
                                        size="small"
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </ListItemSecondaryAction >
                            </ListItem >
                        ))}
                    </List >
                </Card >
            )}

{/* Context Menu */ }
<Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={handleMenuClose}
>
    <MenuItem onClick={() => { handleOpenDialog(selectedItem); handleMenuClose(); }}>
        <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
    </MenuItem>
    <MenuItem onClick={() => handleCopy(selectedItem?.decryptedData?.secret || '')}>
        <CopyIcon fontSize="small" sx={{ mr: 1 }} /> Copy Secret
    </MenuItem>
    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
    </MenuItem>
</Menu>

{/* Add/Edit Dialog */ }
<Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
    <DialogTitle>
        {editingItem ? 'Edit Secret' : 'Add New Secret'}
    </DialogTitle>
    <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
            />
            <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                    value={formData.type}
                    label="Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                    {secretTypes.map(type => (
                        <MenuItem key={type} value={type}>
                            {type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <TextField
                fullWidth
                label="Username (optional)"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
            <TextField
                fullWidth
                label="Secret / Password"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                type="password"
                required
            />
            <TextField
                fullWidth
                label="URL (optional)"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
            <TextField
                fullWidth
                label="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
            />
        </Box>
    </DialogContent>
    <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.secret || saving}
        >
            {saving ? <CircularProgress size={20} /> : (editingItem ? 'Save Changes' : 'Add Secret')}
        </Button>
    </DialogActions>
</Dialog>
        </Box >
    );
};

export default PersonalVault;
