import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie, Settings, X } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = { necessary: true, analytics: true, marketing: true };
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    setShow(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    setShow(false);
    setShowSettings(false);
  };

  const handleRejectAll = () => {
    const minimal = { necessary: true, analytics: false, marketing: false };
    localStorage.setItem('cookie-consent', JSON.stringify(minimal));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie Consent
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShow(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSettings ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Necessary</Label>
                  <p className="text-xs text-muted-foreground">Required for the website to function</p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Analytics</Label>
                  <p className="text-xs text-muted-foreground">Help us improve our website</p>
                </div>
                <Switch
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Marketing</Label>
                  <p className="text-xs text-muted-foreground">Personalized advertisements</p>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSavePreferences} className="flex-1">
                  Save Preferences
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Customize
              </Button>
              <Button variant="outline" onClick={handleRejectAll}>
                Reject All
              </Button>
              <Button onClick={handleAcceptAll}>
                Accept All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
