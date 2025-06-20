'use client'

import React, { useState, useEffect, useCallback, Suspense, ComponentType } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBillById, BillWithRelations } from '@/services/billsService';
import { toast } from '@/components/ui/use-toast';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Box, Card, Container, useMediaQuery, useTheme } from '@mui/material';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { isMobile } from '@/utils/responsive';

// Custom hooks
import { useBillsData } from './hooks/useBillsData';
import { useBillsActions } from './hooks/useBillsActions';
import { trackEvent, trackError, AnalyticsEventTypes } from '@/utils/analytics';

// Components
import { BillsHeader } from './BillsHeader';
import { BillsFilters } from './BillsFilters';
import { BillsTable } from './BillsTable';
import { BillsPagination } from './BillsPagination';
import { BillDetailView } from './BillDetailView';
import { MobileBillDetailView } from './MobileBillDetailView';
import { BillsTableSkeleton, BillDetailSkeleton } from './SkeletonLoaders';

// Interface definitions for dialog component props
interface CreateBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSubmit: (data: any, items: any[]) => Promise<any>;
  isSubmitting: boolean;
}

interface EditBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithRelations;
  onSubmit: (data: any, items: any[], itemsToDelete: any[]) => Promise<void>;
  isSubmitting: boolean;
}

interface DeleteBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithRelations;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithRelations;
  onSubmit: (data: any) => Promise<any>;
  isSubmitting: boolean;
}

interface ConvertPODialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  projectId: string;
  onSubmit: (data: any, items: any[]) => Promise<any>;
  isSubmitting: boolean;
}

// A simplified approach to dynamic imports using any type
// Note: This is a workaround for TypeScript errors with dynamic imports
const CreateBillDialog = dynamic(
  () => Promise.resolve(require('./dialogs/CreateBillDialog').CreateBillDialog)
) as any;

const EditBillDialog = dynamic(
  () => Promise.resolve(require('./dialogs/EditBillDialog').EditBillDialog)
) as any;

const DeleteBillDialog = dynamic(
  () => Promise.resolve(require('./dialogs/DeleteBillDialog').DeleteBillDialog)
) as any;

const RecordPaymentDialog = dynamic(
  () => Promise.resolve(require('./dialogs/RecordPaymentDialog').RecordPaymentDialog)
) as any;

const ConvertPODialog = dynamic(
  () => Promise.resolve(require('./dialogs/ConvertPODialog').ConvertPODialog)
) as any;

interface BillsTabProps {
  project: {
    id: string;
    name: string;
  };
  authStatus: string;
}

export function BillsTab({ project, authStatus }: BillsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for selected bill and dialog visibility
  const [selectedBill, setSelectedBill] = useState<BillWithRelations | null>(null);
  const [billToDelete, setBillToDelete] = useState<BillWithRelations | null>(null);
  const [poToConvert, setPoToConvert] = useState<string | null>(null);
  
  // Dialog visibility states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isConvertPODialogOpen, setIsConvertPODialogOpen] = useState(false);
  const [isConvertingPO, setIsConvertingPO] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialBillData, setInitialBillData] = useState<any>(null);

  // Extract data from hooks
  const {
    bills,
    loading,
    error,
    pagination,
    suppliers,
    filterOptions,
    setFilterOptions,
    fetchBills,
    fetchBillDetails,
    refreshData
  } = useBillsData(project.id);

  const {
    createBill,
    updateBill,
    deleteBill,
    recordPayment,
    convertPOToBill,
    generateBillNumber,
    duplicateBill
  } = useBillsActions(project.id);

  // Track page view on component mount
  useEffect(() => {
    trackEvent(AnalyticsEventTypes.PAGE_VIEW, {
      page: 'bills',
      project_id: project.id,
      project_name: project.name
    });
  }, [project.id, project.name]);

  // Handle URL parameters for direct navigation
  useEffect(() => {
    const poId = searchParams.get('po');
    const viewBillId = searchParams.get('view');
    const billId = searchParams.get('bill');
    
    if (poId && !poToConvert && !isConvertingPO) {
      // Handle PO conversion
      fetchPurchaseOrderData(poId);
    } 
    else if ((viewBillId || billId) && !selectedBill && !loading) {
      // Handle bill view
      const idToView = viewBillId || billId;
      const billInList = bills.find(b => b.id === idToView);
      
      if (billInList) {
        setSelectedBill(billInList);
      } else {
        getBillById(idToView as string).then(fetchedBill => {
          setSelectedBill(fetchedBill);
        }).catch(error => {
          console.error(`Error fetching bill ${idToView}:`, error);
          toast({ 
            title: "Bill Not Found", 
            description: "Could not find the requested bill.", 
            variant: "destructive" 
          });
          trackError(error, { context: 'fetch_bill_detail', bill_id: idToView });
          router.replace(`/projects/${project.id}/cost-control/bills`);
        });
      }
    }
    else if (!viewBillId && !billId && !poId && selectedBill) {
      // Clear selection when URL params are cleared
      setSelectedBill(null);
      setIsPaymentDialogOpen(false);
    }
  }, [searchParams, bills, selectedBill, loading, poToConvert, isConvertingPO, router, project.id]);

  // Handle PO conversion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const poId = params.get('po')
      
      if (poId) {
        // Fetch PO data to populate the bill creation form
        const fetchPurchaseOrderData = async () => {
          try {
            const { data, error } = await supabase
              .from('purchase_orders')
              .select(`
                *,
                supplier:assigned_to,
                items:purchase_order_items(*)
              `)
              .eq('id', poId)
              .single()
              
            if (error) throw error
            if (data) {
              // Prepare bill data from PO
              setInitialBillData({
                poId: data.id,
                poNumber: data.po_number,
                supplier: data.assigned_to,
                description: data.description,
                total: data.total,
                items: data.items
              })
              
              // Open the create dialog
              setIsCreateDialogOpen(true)
              
              // Clean up URL without reloading the page
              window.history.replaceState({}, document.title, window.location.pathname)
            }
          } catch (error) {
            console.error('Error fetching purchase order:', error)
          }
        }
        
        fetchPurchaseOrderData()
      }
    }
  }, [project.id])

  // Purchase order data fetching
  const fetchPurchaseOrderData = async (poId: string) => {
    setIsConvertingPO(true);
    try {
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders').select('*, items:purchase_order_items(*), supplier:supplier_id(*)').eq('id', poId).single();
      
      if (poError) throw poError;
      
      if (poData.status === 'Billed' || poData.linked_bill) {
        toast({ 
          title: "Already Billed", 
          description: `PO ${poData.po_number} is already linked to bill ${poData.linked_bill || '?'}.` 
        });
        router.replace(`/projects/${project.id}/cost-control/bills`); 
        setIsConvertingPO(false); 
        return;
      }
      
      if (poData.status !== 'Approved') {
        toast({ 
          title: "Cannot Convert", 
          description: "Only approved POs can be converted to bills.", 
          variant: "destructive" 
        });
        router.replace(`/projects/${project.id}/cost-control/bills`); 
        setIsConvertingPO(false); 
        return;
      }
      
      setPoToConvert(poId);
      setIsConvertPODialogOpen(true);
      
    } catch (error) {
      console.error("Error fetching PO for conversion:", error);
      toast({ 
        title: "Error", 
        description: "Failed to fetch purchase order data.", 
        variant: "destructive" 
      });
      trackError(error, { context: 'fetch_po_for_conversion', po_id: poId });
      router.replace(`/projects/${project.id}/cost-control/bills`); 
    } finally {
      setIsConvertingPO(false);
    }
  };

  // Handle selecting a bill to view details
  const handleViewBill = useCallback(async (bill: BillWithRelations) => {
    try {
      console.log('handleViewBill called with bill:', bill.id, bill.bill_number);
      setIsDetailLoading(true);
      // Update URL to include the bill ID
      router.push(`/projects/${project.id}/cost-control/bills?view=${bill.id}`);
      
      const fullBill = await fetchBillDetails(bill.id);
      console.log('Bill details fetched:', fullBill.id, fullBill.bill_number);
      setSelectedBill(fullBill);
      trackEvent(AnalyticsEventTypes.BILL_VIEWED, { billId: bill.id });
    } catch (error) {
      console.error('Error in handleViewBill:', error);
      toast({
        title: "Error loading bill details",
        description: "There was a problem loading the bill details. Please try again.",
        variant: "destructive"
      });
      trackError(error, { context: 'bill_detail_load' });
    } finally {
      setIsDetailLoading(false);
    }
  }, [fetchBillDetails, router, project.id]);

  // Close bill detail view
  const handleCloseBillView = useCallback(() => {
    trackEvent(AnalyticsEventTypes.PAGE_VIEW, {
      view: 'bills_list',
      from: 'bill_detail'
    });
    
    setSelectedBill(null);
    setIsPaymentDialogOpen(false);
    router.replace(`/projects/${project.id}/cost-control/bills`, { scroll: false });
  }, [router, project.id]);

  // Dialog handlers
  const handleAddBillClick = useCallback(() => {
    trackEvent(AnalyticsEventTypes.PAGE_VIEW, {
      view: 'create_bill'
    });
    
    setIsCreateDialogOpen(true);
  }, []);

  const handleEditBillClick = useCallback((bill: BillWithRelations) => {
    setSelectedBill(bill);
    setIsEditDialogOpen(true);
    trackEvent(AnalyticsEventTypes.EDIT_DIALOG_OPENED, { billId: bill.id });
  }, []);

  const handleDeleteButtonClick = useCallback((bill: BillWithRelations) => {
    setSelectedBill(bill);
    setIsDeleteDialogOpen(true);
    trackEvent(AnalyticsEventTypes.DELETE_DIALOG_OPENED, { billId: bill.id });
  }, []);

  const handleRecordPaymentClick = useCallback((bill: BillWithRelations) => {
    setSelectedBill(bill);
    setIsPaymentDialogOpen(true);
    trackEvent(AnalyticsEventTypes.PAYMENT_DIALOG_OPENED, { billId: bill.id });
  }, []);

  const handleDuplicateBillClick = useCallback(async (bill: BillWithRelations) => {
    try {
      setIsSubmitting(true);
      const duplicatedBill = await duplicateBill(bill.id);
      
      trackEvent(AnalyticsEventTypes.BILL_DUPLICATED, { 
        billId: bill.id, 
        newBillId: duplicatedBill.id 
      });
      
      await refreshData();
      // Optionally navigate to the duplicated bill
      fetchBillDetails(duplicatedBill.id).then(setSelectedBill);
    } catch (error) {
      console.error("Error duplicating bill:", error);
      trackError(error, { context: 'duplicate_bill_action' });
      toast({
        title: "Duplication Failed",
        description: "There was a problem duplicating the bill. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [duplicateBill, refreshData, fetchBillDetails]);

  const handleConvertPOClick = useCallback((poId: string) => {
    setPoToConvert(poId);
    setIsConvertPODialogOpen(true);
    trackEvent(AnalyticsEventTypes.PO_DIALOG_OPENED, { poId });
  }, []);

  // Handle form submission success events
  const handleAddBillSuccess = useCallback(async (newBillId: string) => {
    setIsCreateDialogOpen(false);
    await refreshData();
    // Optionally load the newly created bill
    fetchBillDetails(newBillId).then(setSelectedBill);
    trackEvent(AnalyticsEventTypes.BILL_CREATED, { billId: newBillId });
  }, [refreshData, fetchBillDetails]);

  const handleEditBillSuccess = useCallback(async () => {
    setIsEditDialogOpen(false);
    if (selectedBill) {
      await fetchBillDetails(selectedBill.id).then(setSelectedBill);
    }
    await refreshData();
    trackEvent(AnalyticsEventTypes.BILL_UPDATED, { billId: selectedBill?.id });
  }, [selectedBill, fetchBillDetails, refreshData]);

  const handleDeleteBillSuccess = useCallback(async () => {
    setIsDeleteDialogOpen(false);
    setSelectedBill(null);
    await refreshData();
    trackEvent(AnalyticsEventTypes.BILL_DELETED, { billId: selectedBill?.id });
    return Promise.resolve();
  }, [selectedBill, refreshData]);

  const handleRecordPaymentSuccess = useCallback(async (data: Record<string, any>) => {
    setIsPaymentDialogOpen(false);
    if (selectedBill) {
      await fetchBillDetails(selectedBill.id).then(setSelectedBill);
    }
    await refreshData();
    trackEvent(AnalyticsEventTypes.PAYMENT_RECORDED, { billId: selectedBill?.id });
    return Promise.resolve(data);
  }, [selectedBill, fetchBillDetails, refreshData]);

  const handleConvertPOSuccess = useCallback(async (newBillId: string) => {
    setIsConvertPODialogOpen(false);
    setPoToConvert(null);
    await refreshData();
    await fetchBillDetails(newBillId).then(setSelectedBill);
    trackEvent(AnalyticsEventTypes.PO_CONVERTED, { billId: newBillId, poId: poToConvert });
    return Promise.resolve(newBillId);
  }, [poToConvert, refreshData, fetchBillDetails]);

  if (error) {
    return (
      <ErrorBoundary onError={(error) => trackError(error, { context: 'bills_list_view' })}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h3 className="text-lg font-medium">Error loading bills</h3>
            <p className="text-sm text-gray-500 mt-2">
              There was a problem loading bills. Please try again.
            </p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              onClick={() => refreshData()}
            >
              Retry
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={(error) => trackError(error, { context: 'bills_list_view' })}>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 5 }}>
        <ErrorBoundary componentName="BillsTab">
          <Box sx={{ position: 'relative', minHeight: '80vh' }}>
            <BillsHeader 
              onAddBill={handleAddBillClick} 
              onRefresh={refreshData} 
              isRefreshing={loading} 
            />
            
            <BillsFilters 
              filters={filterOptions} 
              setFilters={setFilterOptions}
              suppliers={suppliers}
            />
            
            {/* Debugging - show when a bill is selected */}
            {selectedBill && (
              <div className="my-2 p-2 bg-blue-100 text-blue-800 rounded">
                Selected bill: {selectedBill.bill_number} (ID: {selectedBill.id})
              </div>
            )}
            
            {/* Show the card only if no bill is selected */}
            {!selectedBill ? (
              <Card sx={{ mb: 3, overflow: 'auto' }}>
                {loading ? (
                  <BillsTableSkeleton />
                ) : (
                  <>
                    <BillsTable 
                      bills={bills}
                      loading={loading}
                      error={error}
                      sortBy={filterOptions.sortBy}
                      sortDirection={filterOptions.sortDirection}
                      onSortChange={(column: string) => {
                        // Toggle direction if clicking the same column
                        const newDirection = filterOptions.sortBy === column && filterOptions.sortDirection === 'desc' ? 'asc' : 'desc';
                        setFilterOptions({ ...filterOptions, sortBy: column, sortDirection: newDirection });
                      }}
                      onView={handleViewBill}
                      onEdit={handleEditBillClick}
                      onDelete={handleDeleteButtonClick}
                      onRecordPayment={handleRecordPaymentClick}
                      onDuplicate={handleDuplicateBillClick}
                      onAddBill={handleAddBillClick}
                      onConvertPO={handleConvertPOClick}
                    />
                    
                    <BillsPagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(page) => pagination.setPage(page)}
                      isLoading={loading}
                      totalItems={pagination.totalItems}
                      pageSize={pagination.pageSize}
                    />
                  </>
                )}
              </Card>
            ) : null}
            
            {/* Detail Views - Show when a bill is selected */}
            {selectedBill && (
              <div className="mt-4">
                {isDetailLoading ? (
                  <BillDetailSkeleton />
                ) : mobile ? (
                  <MobileBillDetailView
                    bill={selectedBill}
                    onClose={handleCloseBillView}
                    onEdit={handleEditBillClick}
                    onDelete={handleDeleteButtonClick}
                    onPayment={handleRecordPaymentClick}
                    onDuplicate={handleDuplicateBillClick}
                  />
                ) : (
                  <BillDetailView
                    bill={selectedBill}
                    onClose={handleCloseBillView}
                    onEdit={handleEditBillClick}
                    onDelete={handleDeleteButtonClick}
                    onRecordPayment={handleRecordPaymentClick}
                    onDuplicate={handleDuplicateBillClick}
                    projectId={project.id}
                  />
                )}
              </div>
            )}
            
            {/* Dialogs */}
            {isCreateDialogOpen && (
              <CreateBillDialog 
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                projectId={project.id}
                onSubmit={async (billData: Record<string, any>, billItems: Array<any>) => {
                  setIsSubmitting(true);
                  try {
                    console.log("Calling createBill with data:", billData);
                    const result = await createBill(billData, billItems);
                    console.log("Bill creation successful:", result);
                    await handleAddBillSuccess(result.id);
                    return result;
                  } catch (error) {
                    console.error("Error in createBill submit handler:", error);
                    throw error;
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                isSubmitting={isSubmitting}
              />
            )}
            
            {isEditDialogOpen && selectedBill && (
              <EditBillDialog 
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                bill={selectedBill}
                onSubmit={async (
                  data: Record<string, any>, 
                  items: Array<any>, 
                  itemsToDelete: Array<any>
                ) => {
                  await updateBill(selectedBill.id, data, items, itemsToDelete);
                  handleEditBillSuccess();
                }}
                isSubmitting={loading}
              />
            )}
            
            {isDeleteDialogOpen && selectedBill && (
              <DeleteBillDialog 
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                bill={selectedBill}
                onConfirm={async () => {
                  await deleteBill(selectedBill.id);
                  handleDeleteBillSuccess();
                }}
                isSubmitting={loading}
              />
            )}
            
            {isPaymentDialogOpen && selectedBill && (
              <RecordPaymentDialog 
                isOpen={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                bill={selectedBill}
                onSubmit={async (data: Record<string, any>) => {
                  await recordPayment(data);
                  handleRecordPaymentSuccess(data);
                  return data;
                }}
                isSubmitting={loading}
              />
            )}
            
            {isConvertPODialogOpen && poToConvert && (
              <ConvertPODialog 
                isOpen={isConvertPODialogOpen}
                onOpenChange={setIsConvertPODialogOpen}
                poId={poToConvert}
                projectId={project.id}
                onSubmit={async (data: Record<string, any>, items: Array<any>) => {
                  const newBill = await convertPOToBill(poToConvert, data);
                  handleConvertPOSuccess(newBill.id);
                  return newBill;
                }}
                isSubmitting={loading}
              />
            )}
          </Box>
        </ErrorBoundary>
      </Container>
    </ErrorBoundary>
  );
} 