'use client'

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { useUser } from '@/lib/hooks/useUser';
import { Course } from '@/lib/api';

interface PurchaseDialogProps {
  course: Course;
  children: React.ReactNode;
}

export function PurchaseDialog({ course, children }: PurchaseDialogProps) {
  const { user } = useUser();
  const { createPurchase, loading } = usePurchases();
  
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'bank_transfer' | 'paypal'>('credit_card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      setError('You must be logged in to make a purchase');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const purchaseData = {
        userId: user.id,
        courseId: course.id.toString(),
        courseName: course.title,
        amount: course.price || 0,
        currency: 'USD',
        paymentMethod: paymentMethod,
        description: `Purchase of ${course.title} course`
      };

      const result = await createPurchase(purchaseData);
      
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          // Reset form
          setCardDetails({
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardholderName: ''
          });
        }, 2000);
      } else {
        setError('Failed to process purchase. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Purchase Successful!</h3>
            <p className="text-gray-600 mb-4">
              You have successfully purchased <strong>{course.title}</strong>
            </p>
            <p className="text-sm text-gray-500">
              You will receive a confirmation email shortly.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Course
          </DialogTitle>
          <DialogDescription>
            Complete your purchase of {course.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription>{course.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Price</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${course.price?.toLocaleString() || '0'}</div>
                  {course.discount_percentage && course.discount_percentage > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {course.discount_percentage}% off
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Payment Method</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={paymentMethod === 'credit_card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('credit_card')}
                className="h-12 flex-col"
              >
                <CreditCard className="h-4 w-4 mb-1" />
                <span className="text-xs">Credit Card</span>
              </Button>
              <Button
                variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('bank_transfer')}
                className="h-12 flex-col"
              >
                <Lock className="h-4 w-4 mb-1" />
                <span className="text-xs">Bank Transfer</span>
              </Button>
              <Button
                variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('paypal')}
                className="h-12 flex-col"
              >
                <Lock className="h-4 w-4 mb-1" />
                <span className="text-xs">PayPal</span>
              </Button>
            </div>
          </div>

          {/* Payment Details */}
          {paymentMethod === 'credit_card' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  placeholder="John Doe"
                  value={cardDetails.cardholderName}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, cardholderName: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.cardNumber}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                  maxLength={19}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={cardDetails.expiryDate}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, expiryDate: formatExpiryDate(e.target.value) }))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'bank_transfer' && (
            <div className="text-center py-8 text-gray-600">
              <Lock className="h-8 w-8 mx-auto mb-2" />
              <p>Bank transfer details will be provided after purchase confirmation.</p>
            </div>
          )}

          {paymentMethod === 'paypal' && (
            <div className="text-center py-8 text-gray-600">
              <Lock className="h-8 w-8 mx-auto mb-2" />
              <p>You will be redirected to PayPal for secure payment processing.</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <Separator />

          {/* Purchase Summary */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Course Price</span>
              <span>${course.price?.toLocaleString() || '0'}</span>
            </div>
            {course.discount_percentage && course.discount_percentage > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({course.discount_percentage}%)</span>
                <span>-${((course.price || 0) * course.discount_percentage / 100).toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${course.price?.toLocaleString() || '0'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isProcessing || loading}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Complete Purchase
                </>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-gray-500">
            <Lock className="h-3 w-3 inline mr-1" />
            Your payment information is secure and encrypted
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
