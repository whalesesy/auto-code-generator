import { useState, useEffect } from 'react';
import { useTOTP } from '@/hooks/useTOTP';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, ShieldOff, Copy, Eye, EyeOff, QrCode } from 'lucide-react';

export function MFASetup() {
  const { loading, error, getStatus, setup, enable, disable } = useTOTP();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_uri: string; backup_codes: string[] } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const status = await getStatus();
      setMfaEnabled(status.mfa_enabled);
    } catch {
      // MFA not set up
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSetup = async () => {
    try {
      const data = await setup();
      setSetupData(data);
    } catch (err) {
      toast({
        title: 'Setup failed',
        description: error || 'Failed to start MFA setup',
        variant: 'destructive',
      });
    }
  };

  const handleEnable = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    try {
      await enable(verificationCode);
      setMfaEnabled(true);
      setIsSetupOpen(false);
      setSetupData(null);
      setVerificationCode('');
      toast({
        title: 'MFA Enabled',
        description: 'Two-factor authentication has been enabled for your account.',
      });
    } catch (err) {
      toast({
        title: 'Verification failed',
        description: error || 'Invalid verification code',
        variant: 'destructive',
      });
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    try {
      await disable(disableCode);
      setMfaEnabled(false);
      setIsDisableOpen(false);
      setDisableCode('');
      toast({
        title: 'MFA Disabled',
        description: 'Two-factor authentication has been disabled.',
      });
    } catch (err) {
      toast({
        title: 'Disable failed',
        description: error || 'Invalid verification code',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 animate-pulse" />
            <span>Checking MFA status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
          </div>
          <Badge variant={mfaEnabled ? 'default' : 'secondary'}>
            {mfaEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <CardDescription>
          Add an extra layer of security to your account using a TOTP authenticator app like Google Authenticator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mfaEnabled ? (
          <Dialog open={isDisableOpen} onOpenChange={setIsDisableOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <ShieldOff className="h-4 w-4" />
                Disable MFA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Enter your current authenticator code to disable MFA. This will make your account less secure.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="disableCode">Verification Code</Label>
                  <Input
                    id="disableCode"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={loading || disableCode.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Disabling...' : 'Disable MFA'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={handleSetup}>
                <ShieldCheck className="h-4 w-4" />
                Enable MFA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Scan the QR code with your authenticator app or enter the secret key manually.
                </DialogDescription>
              </DialogHeader>
              
              {setupData ? (
                <div className="space-y-4">
                  {/* QR Code placeholder - In production, use a QR library */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-4 bg-muted rounded-lg flex items-center justify-center">
                      <QrCode className="h-32 w-32 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Scan this QR code with your authenticator app
                    </p>
                  </div>
                  
                  {/* Manual entry */}
                  <div className="space-y-2">
                    <Label>Secret Key (for manual entry)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={setupData.secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(setupData.secret)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Backup codes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Backup Codes</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBackupCodes(!showBackupCodes)}
                      >
                        {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showBackupCodes && (
                      <Alert>
                        <AlertDescription>
                          <p className="text-sm mb-2">Save these backup codes in a safe place. Each can only be used once.</p>
                          <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                            {setupData.backup_codes.map((code, i) => (
                              <div key={i} className="bg-muted px-2 py-1 rounded">{code}</div>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => copyToClipboard(setupData.backup_codes.join('\n'))}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy All Codes
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  {/* Verification */}
                  <div className="space-y-2">
                    <Label htmlFor="verifyCode">Enter code from your app</Label>
                    <Input
                      id="verifyCode"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                    />
                  </div>
                  
                  <Button
                    onClick={handleEnable}
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {loading ? 'Verifying...' : 'Verify and Enable MFA'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
