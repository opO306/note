import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";

interface AttributionsScreenProps {
    onBack: () => void;
}

export function AttributionsScreen({ onBack }: AttributionsScreenProps) {
    return (
        <div className="w-full h-full bg-background text-foreground overflow-y-auto scrollbar-hide">
            {/* Header */}
            <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
                <div className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center space-x-2">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            <h1 className="font-medium">이미지·아이콘 출처</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-4 space-y-6 pb-20">
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>안내</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed">
                        <p>
                            이 화면은 비유노트 앱에서 사용하는 이미지와 아이콘의 출처를
                            정리한 페이지입니다.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            실제 사용되는 자원 목록은 개발 과정에서 변경될 수 있습니다.
                            앱 출시 전에 한 번 더 확인해 주세요.
                        </p>
                    </CardContent>
                </Card>

                {/* Unsplash */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>1. Unsplash 이미지</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm leading-relaxed">
                        <p>
                            앱에서 사용하는 일부 사진 이미지는 Unsplash에서 제공하는
                            무료 이미지를 기반으로 합니다.
                        </p>
                        <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                            <li>상업적·비상업적 용도로 무료 사용 가능</li>
                            <li>이미지 단독 재판매는 금지</li>
                            <li>Unsplash와 유사한 이미지 서비스로 재배포 금지</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                            자세한 내용은 Unsplash 웹사이트의 라이선스 페이지를 참고해 주세요.
                        </p>
                    </CardContent>
                </Card>

                {/* 아이콘 출처 요약 */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>2. 아이콘</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm leading-relaxed">
                        <p>
                            앱의 아이콘들은 주로 Lucide 아이콘 라이브러리에서 제공하는
                            벡터 아이콘을 사용합니다.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            자세한 라이선스와 저작권 정보는 &quot;오픈소스 라이선스&quot;
                            화면에서 확인하실 수 있습니다.
                        </p>
                    </CardContent>
                </Card>

                {/* 기타 */}
                <Card className="border-border">
                    <CardHeader>
                        <CardTitle>3. 기타 리소스</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm leading-relaxed">
                        <p>
                            앱 내의 나머지 UI 요소, 일러스트, 텍스트 등은 비유노트 팀에서
                            직접 제작하거나, 라이선스를 확인한 후 사용합니다.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            문제가 될 수 있는 요소를 발견하신 경우, 고객센터나 문의 메일로
                            알려주시면 최대한 빠르게 조치하겠습니다.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default AttributionsScreen;
