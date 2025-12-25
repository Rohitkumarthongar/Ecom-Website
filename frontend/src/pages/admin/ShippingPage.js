import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { ordersAPI, courierAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Truck, Package, Printer, Search, RefreshCw, ExternalLink } from 'lucide-react';

export default function ShippingPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [shippingOrder, setShippingOrder] = useState(null);
    const [trackInfo, setTrackInfo] = useState(null);
    const [isShipLoading, setIsShipLoading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Fetch all orders for now, filter client side or backend if supported
            const response = await ordersAPI.getAll({ limit: 100 });
            setOrders(response.data.orders || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleShipOrder = async (order) => {
        setIsShipLoading(true);
        try {
            const response = await courierAPI.shipOrder(order.id);
            if (response.data.success) {
                toast.success(`Order shipped! AWB: ${response.data.awb}`);
                fetchOrders(); // Refresh status
                setShippingOrder(null);
            } else {
                toast.error(response.data.error || 'Shipping failed');
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Shipping failed');
        } finally {
            setIsShipLoading(false);
        }
    };

    const handleTrack = async (order) => {
        try {
            const response = await courierAPI.trackOrder(order.id);
            if (response.data.success) {
                setTrackInfo(response.data.data); // Delhivery returns 'Shipment' object
            } else {
                toast.error('Tracking info not found');
            }
        } catch (error) {
            toast.error('Failed to track order');
        }
    };

    const handlePrintLabel = async (order) => {
        try {
            const response = await courierAPI.getLabel(order.id);
            if (response.data.url) {
                window.open(response.data.url, '_blank');
            } else {
                toast.error('Label URL not found');
            }
        } catch (error) {
            toast.error('Failed to get label');
        }
    };

    // Filter orders
    const filteredOrders = orders.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.shipping_address?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingShipping = filteredOrders.filter(o => o.status === 'pending' || o.status === 'processing');
    const shippedOrders = filteredOrders.filter(o => o.status === 'shipped' || o.status === 'delivered');

    return (
        <div className="space-y-6" data-testid="shipping-page">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Truck className="w-6 h-6" /> Shipping Management
                    </h1>
                    <p className="text-slate-400">Manage deliveries only with Delhivery</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search Order ID or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 bg-slate-800 border-slate-700"
                        />
                    </div>
                    <Button variant="outline" onClick={fetchOrders}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Pending Shipping */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-amber-400 flex items-center gap-2">
                            <Package className="w-5 h-5" /> Pending Shipments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-700">
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
                                ) : pendingShipping.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500">No pending shipments</TableCell></TableRow>
                                ) : (
                                    pendingShipping.map(order => (
                                        <TableRow key={order.id} className="border-slate-700">
                                            <TableCell className="font-medium">{order.order_number}</TableCell>
                                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <div>{order.shipping_address?.name}</div>
                                                <div className="text-xs text-slate-400">{order.shipping_address?.city}, {order.shipping_address?.pincode}</div>
                                            </TableCell>
                                            <TableCell>₹{order.grand_total}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => setShippingOrder(order)}
                                                >
                                                    Ship Now
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Shipped Orders */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-emerald-400 flex items-center gap-2">
                            <Truck className="w-5 h-5" /> Shipped Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-700">
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>AWB Number</TableHead>
                                    <TableHead>Courier</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shippedOrders.map(order => (
                                    <TableRow key={order.id} className="border-slate-700">
                                        <TableCell>{order.order_number}</TableCell>
                                        <TableCell className="font-mono">{order.tracking_number || '-'}</TableCell>
                                        <TableCell>{order.courier_provider || 'Manual'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            {order.tracking_number && (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => handlePrintLabel(order)}>
                                                        <Printer className="w-4 h-4 mr-1" /> Label
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => { setTrackInfo(null); handleTrack(order); }}>
                                                        <ExternalLink className="w-4 h-4 mr-1" /> Track
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={!!shippingOrder} onOpenChange={(open) => !open && setShippingOrder(null)}>
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle>Confirm Shipment</DialogTitle>
                        <DialogDescription>
                            Create a shipping label for Order #{shippingOrder?.order_number}?
                            This will request a pickup from your warehouse.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-400">Customer:</span>
                                <p>{shippingOrder?.shipping_address?.name}</p>
                            </div>
                            <div>
                                <span className="text-slate-400">Pincode:</span>
                                <p>{shippingOrder?.shipping_address?.pincode}</p>
                            </div>
                            <div>
                                <span className="text-slate-400">Payment:</span>
                                <p>{shippingOrder?.payment_method === 'online' ? 'Prepaid' : 'COD'}</p>
                            </div>
                            <div>
                                <span className="text-slate-400">Amount:</span>
                                <p>₹{shippingOrder?.grand_total}</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShippingOrder(null)}>Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleShipOrder(shippingOrder)}
                            disabled={isShipLoading}
                        >
                            {isShipLoading ? 'Processing...' : 'Confirm & Ship'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tracking Dialog */}
            <Dialog open={!!trackInfo} onOpenChange={(open) => !open && setTrackInfo(null)}>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Tracking Information</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {trackInfo && (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Status</p>
                                        <p className="font-seminold text-lg capitalize">{trackInfo.Status?.Status}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Location</p>
                                        <p>{trackInfo.Status?.StatusLocation}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Expected Delivery</p>
                                        <p>{trackInfo.E.D ? trackInfo.E.D : 'N/A'}</p>
                                        {/* Assuming E.D is Expected Delivery, mimicking typical Delhivery logic */}
                                    </div>
                                </div>

                                <div className="space-y-4 border-l-2 border-slate-700 ml-2 pl-4">
                                    {trackInfo.Scans?.map((scan, idx) => (
                                        <div key={idx} className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500"></div>
                                            <p className="font-medium">{scan.ScanDetail?.Scan}</p>
                                            <p className="text-sm text-slate-400">{scan.ScanDetail?.ScannedLocation} - {scan.ScanDetail?.ScanDateTime}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
