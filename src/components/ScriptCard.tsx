// src/components/ScriptCard.tsx
import {ExternalLink} from 'lucide-react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import type {Script} from '@/types/script';

interface ScriptCardProps {
    script: Script;
}

export default function ScriptCard({ script }: ScriptCardProps) {
    const handleInstall = () => {
        console.log(`Installing script: ${script.id}`);
    };

    return (
        <Card className="flex flex-col transition-all hover:shadow-lg">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{script.icon}</span>
                        <div>
                            <CardTitle className="text-xl">{script.name}</CardTitle>
                            <CardDescription className="mt-1">
                                v{script.version} • {script.category}
                            </CardDescription>
                        </div>
                    </div>
                    {/*{script.rating && (
                        <div className="flex items-center gap-1 text-sm font-medium">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {script.rating}
                        </div>
                    )}*/}
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">{script.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {script.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                        </Badge>
                    ))}
                </div>

                {/*{script.installs && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Download className="h-4 w-4" />
                        {script.installs.toLocaleString()} instalaciones
                    </div>
                )}*/}
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                <Button asChild className="w-full" onClick={handleInstall}>
                    <a href={script.fileUrl}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Install Script
                    </a>
                </Button>
                <p className="text-xs text-muted-foreground">by {script.author}</p>
            </CardFooter>
        </Card>
    );
}