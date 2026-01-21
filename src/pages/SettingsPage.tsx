import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor, Settings } from 'lucide-react';
import { PageHeader } from '@/components/common/PageComponents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeCardProps {
  value: ThemeOption;
  currentTheme: string | undefined;
  label: string;
  description: string;
  icon: React.ReactNode;
  onSelect: (value: ThemeOption) => void;
}

function ThemeCard({ value, currentTheme, label, description, icon, onSelect }: ThemeCardProps) {
  const isSelected = currentTheme === value;
  
  return (
    <div
      onClick={() => onSelect(value)}
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
      )}
    >
      <div className={cn(
        'p-3 rounded-lg',
        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <RadioGroupItem value={value} id={value} className="sr-only" />
          <Label 
            htmlFor={value} 
            className="text-base font-medium cursor-pointer"
          >
            {label}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const themeOptions: Array<{
    value: ThemeOption;
    labelKey: string;
    descriptionKey: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'light',
      labelKey: 'settings.lightMode',
      descriptionKey: 'settings.lightModeDescription',
      icon: <Sun className="h-5 w-5" />,
    },
    {
      value: 'dark',
      labelKey: 'settings.darkMode',
      descriptionKey: 'settings.darkModeDescription',
      icon: <Moon className="h-5 w-5" />,
    },
    {
      value: 'system',
      labelKey: 'settings.systemMode',
      descriptionKey: 'settings.systemModeDescription',
      icon: <Monitor className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings.appearance')}
          </CardTitle>
          <CardDescription>{t('settings.appearanceDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value)}
            className="grid gap-4 md:grid-cols-3"
          >
            {themeOptions.map((option) => (
              <ThemeCard
                key={option.value}
                value={option.value}
                currentTheme={theme}
                label={t(option.labelKey)}
                description={t(option.descriptionKey)}
                icon={option.icon}
                onSelect={setTheme}
              />
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
