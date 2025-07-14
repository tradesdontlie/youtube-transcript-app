import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { 
  LoadingButton, 
  LoadingState, 
  InlineLoading, 
  FullPageLoading,
  Skeleton,
  SkeletonText,
  SkeletonCard
} from './LoadingStates';

export const UITestPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showFullPageLoading, setShowFullPageLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);
  const [disabledState, setDisabledState] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <FullPageLoading isLoading={showFullPageLoading} message="Loading application..." />
      
      <Card>
        <CardHeader>
          <CardTitle>UI Component Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Button States */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Button States</h3>
            <div className="flex flex-wrap gap-3">
              <Button>Default Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
              <Button disabled>Disabled</Button>
              <Button onClick={() => setIsLoading(!isLoading)}>
                <LoadingButton isLoading={isLoading} loadingText="Processing">
                  Click Me
                </LoadingButton>
              </Button>
            </div>
          </div>

          {/* Input Fields */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Input Fields</h3>
            <div className="space-y-3 max-w-md">
              <div>
                <Label htmlFor="normal-input">Normal Input</Label>
                <Input 
                  id="normal-input"
                  placeholder="Enter text here..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="disabled-input">Disabled Input</Label>
                <Input 
                  id="disabled-input"
                  placeholder="Disabled input" 
                  disabled 
                />
              </div>
              <div>
                <Label htmlFor="textarea">Textarea</Label>
                <Textarea 
                  id="textarea"
                  placeholder="Enter multiple lines..." 
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Select Dropdown */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Select Dropdown</h3>
            <div className="max-w-xs">
              <Select value={selectValue} onValueChange={setSelectValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading States */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Loading States</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <LoadingState isLoading={true} size="sm" message="Small loading..." />
                <LoadingState isLoading={true} message="Default loading..." />
                <LoadingState isLoading={true} size="lg" message="Large loading..." />
              </div>
              <div className="flex items-center gap-2">
                <span>Inline loading example:</span>
                <InlineLoading isLoading={true} />
              </div>
              <Button onClick={() => setShowFullPageLoading(!showFullPageLoading)}>
                Toggle Full Page Loading
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Badges</h3>
            <div className="flex gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>

          {/* Tabs */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Tabs</h3>
            <Tabs defaultValue="tab1" className="w-full">
              <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="p-4">
                <p>Content for Tab 1</p>
              </TabsContent>
              <TabsContent value="tab2" className="p-4">
                <p>Content for Tab 2</p>
              </TabsContent>
              <TabsContent value="tab3" className="p-4">
                <p>Content for Tab 3</p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Skeleton Loading */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Skeleton Loading</h3>
            <div className="space-y-4">
              <SkeletonCard />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>

          {/* Switch */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Switch</h3>
            <div className="flex items-center gap-2">
              <Switch 
                checked={switchValue} 
                onCheckedChange={setSwitchValue}
              />
              <Label>Enable feature</Label>
            </div>
          </div>

          {/* Disabled State Toggle */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test Disabled States</h3>
            <div className="space-y-3">
              <Button onClick={() => setDisabledState(!disabledState)}>
                Toggle Disabled State
              </Button>
              <div className="flex gap-3">
                <Button disabled={disabledState}>Test Button</Button>
                <Input placeholder="Test input" disabled={disabledState} />
                <Switch disabled={disabledState} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};