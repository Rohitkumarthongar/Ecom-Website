import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { reportsAPI } from '../../lib/api';
import { BarChart3, TrendingUp, TrendingDown, Package, IndianRupee, RefreshCcw, Download } from 'lucide-react';

export default function AdminReports() {
  const [salesReport, setSalesReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(dateRange));

      const [salesRes, inventoryRes, profitRes] = await Promise.all([
        reportsAPI.getSales({ date_from: fromDate.toISOString() }),
        reportsAPI.getInventory(),
        reportsAPI.getProfitLoss({ date_from: fromDate.toISOString() }),
      ]);

      setSalesReport(salesRes.data);
      setInventoryReport(inventoryRes.data);
      setProfitReport(profitRes.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <Card className="bg-slate-800 border-slate-700">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-slate-700/50`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-slate-400 text-sm">{title}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6" data-testid="admin-reports">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-slate-400">Track your business performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 input-admin">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-slate-600" onClick={fetchReports}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : salesReport && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Sales"
                  value={`₹${(salesReport.summary.total_sales || 0).toLocaleString()}`}
                  icon={IndianRupee}
                  color="text-emerald-400"
                />
                <StatCard
                  title="Total Orders"
                  value={salesReport.summary.total_orders || 0}
                  icon={Package}
                  color="text-blue-400"
                />
                <StatCard
                  title="Online Sales"
                  value={`₹${(salesReport.summary.online_sales || 0).toLocaleString()}`}
                  icon={TrendingUp}
                  color="text-violet-400"
                />
                <StatCard
                  title="Offline Sales"
                  value={`₹${(salesReport.summary.offline_sales || 0).toLocaleString()}`}
                  icon={BarChart3}
                  color="text-amber-400"
                />
              </div>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle>Daily Sales Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesReport.daily_breakdown?.length > 0 ? (
                    <div className="space-y-2">
                      {salesReport.daily_breakdown.slice(-10).map((day) => (
                        <div key={day.date} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-400">{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <div className="text-right">
                            <p className="font-semibold">₹{day.sales.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">{day.orders} orders</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-8">No sales data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : inventoryReport && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Products"
                  value={inventoryReport.summary.total_products || 0}
                  icon={Package}
                  color="text-blue-400"
                />
                <StatCard
                  title="Stock Value"
                  value={`₹${(inventoryReport.summary.total_stock_value || 0).toLocaleString()}`}
                  icon={IndianRupee}
                  color="text-emerald-400"
                />
                <StatCard
                  title="Low Stock Items"
                  value={inventoryReport.summary.low_stock_count || 0}
                  icon={TrendingDown}
                  color="text-amber-400"
                />
                <StatCard
                  title="Out of Stock"
                  value={inventoryReport.summary.out_of_stock_count || 0}
                  icon={TrendingDown}
                  color="text-red-400"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle>Low Stock Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {inventoryReport.low_stock_products?.length > 0 ? (
                      <div className="space-y-2">
                        {inventoryReport.low_stock_products.map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                              <p className="text-xs text-slate-400">{product.sku}</p>
                            </div>
                            <div className="flex gap-4 items-center">
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Sold</p>
                                <span className="text-blue-400 font-semibold">{product.sold_qty || 0}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Stock</p>
                                <span className="text-amber-400 font-semibold">{product.stock_qty}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-400 py-4">No low stock items</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle>Out of Stock Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {inventoryReport.out_of_stock_products?.length > 0 ? (
                      <div className="space-y-2">
                        {inventoryReport.out_of_stock_products.map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                              <p className="text-xs text-slate-400">{product.sku}</p>
                            </div>
                            <div className="flex gap-4 items-center">
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Sold</p>
                                <span className="text-blue-400 font-semibold">{product.sold_qty || 0}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Stock</p>
                                <span className="text-red-400 font-semibold">0</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-400 py-4">No out of stock items</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Profit & Loss Report */}
        <TabsContent value="profit" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : profitReport && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={`₹${(profitReport.summary.total_revenue || 0).toLocaleString()}`}
                  icon={IndianRupee}
                  color="text-emerald-400"
                />
                <StatCard
                  title="Total Cost"
                  value={`₹${(profitReport.summary.total_cost || 0).toLocaleString()}`}
                  icon={TrendingDown}
                  color="text-red-400"
                />
                <StatCard
                  title="Net Profit"
                  value={`₹${(profitReport.summary.net_profit || 0).toLocaleString()}`}
                  icon={TrendingUp}
                  color={profitReport.summary.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  subtext={`${(profitReport.summary.profit_margin || 0).toFixed(1)}% margin`}
                />
              </div>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle>Profit Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <span>Gross Profit</span>
                      <span className="font-bold text-emerald-400">₹{(profitReport.summary.gross_profit || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <span>Total Refunds</span>
                      <span className="font-bold text-amber-400">₹{(profitReport.summary.total_refunds || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <span>Orders Completed</span>
                      <span className="font-bold text-blue-400">{profitReport.orders_count || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                      <span>Returns Processed</span>
                      <span className="font-bold text-red-400">{profitReport.returns_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
