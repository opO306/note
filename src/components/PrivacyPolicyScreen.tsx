import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, Shield } from "lucide-react";

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
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
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-medium">개인정보 처리방침</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-20">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>1. 개인정보의 수집 및 이용 목적</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              비유노트(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
              이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라
              별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <div className="pl-4 space-y-2">
              <p>• 회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공</p>
              <p>• 서비스 제공: 콘텐츠 제공, 맞춤형 서비스 제공</p>
              <p>• 커뮤니티 운영: 게시글 작성, 댓글 작성, 등불 시스템 운영</p>
              <p>• 부정 이용 방지: 부정 이용 방지, 비인가 사용 방지</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>2. 수집하는 개인정보 항목</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>회사는 다음과 같은 개인정보를 수집하고 있습니다:</p>
            <div className="pl-4 space-y-2">
              <p>
                <strong>필수 항목:</strong>
              </p>
              <p className="pl-4">• 이메일 주소 (소셜 로그인 시)</p>
              <p className="pl-4">• 닉네임</p>
              <p className="pl-4">• 프로필 이미지 (선택사항)</p>
              <br />
              <p>
                <strong>자동 수집 항목:</strong>
              </p>
              <p className="pl-4">• 서비스 이용 기록</p>
              <p className="pl-4">• 접속 로그</p>
              <p className="pl-4">• 쿠키 및 로컬 스토리지 정보</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>3. 개인정보의 보유 및 이용 기간</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
              개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서
              개인정보를 처리·보유합니다.
            </p>
            <div className="pl-4 space-y-2">
              <p>
                • <strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 즉시 삭제)
              </p>
              <p>
                • <strong>게시글 및 댓글:</strong> 게시글 및 댓글: 작성 후 30분 경과 시 수정/삭제 불가하나,
                회원 탈퇴 시 작성자 정보는 "탈퇴한 사용자"로 익명 처리됩니다.
              </p>
              <p>
                • <strong>등불 시스템 데이터:</strong> 서비스 제공 기간 동안 보유
              </p>
              <p>
                • <strong>부정 이용 기록:</strong> 관련 법령에 따라 보관
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>4. 개인정보의 저장 방식</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              회사는 사용자의 개인정보를 다음과 같이 안전하게 저장하고 있습니다:
            </p>
            <div className="pl-4 space-y-2">
              <p>• <strong>로컬 저장:</strong> 사용자 기기의 로컬 스토리지에 저장</p>
              <p>• <strong>서버 저장:</strong> 암호화된 데이터베이스에 저장</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>5. 개인정보의 제3자 제공</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              회사는 정보주체의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 다음의 경우에는 예외로 합니다:
            </p>
            <div className="pl-4 space-y-2">
              <p>• 정보주체가 사전에 동의한 경우</p>
              <p>• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>6. 정보주체의 권리·의무 및 행사방법</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
            <div className="pl-4 space-y-2">
              <p>• 개인정보 열람 요구</p>
              <p>• 오류 등이 있을 경우 정정 요구</p>
              <p>• 삭제 요구</p>
              <p>• 처리 정지 요구</p>
            </div>
            <p className="mt-4">
              위 권리 행사는 앱 내 "내 정보" → "설정" → "계정 탈퇴"를 통해
              직접 수행하거나, 고객센터를 통해 요청할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>7. 개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              회사는 서비스 제공을 위해 로컬 스토리지(Local Storage)를 사용합니다.
              로컬 스토리지는 사용자의 기기에 저장되며, 브라우저 설정을 통해
              삭제할 수  있습니다.
            </p>
            <div className="pl-4 space-y-2 mt-3">
              <p><strong>수집 목적:</strong></p>
              <p className="pl-4">• 로그인 상태 유지</p>
              <p className="pl-4">• 사용자 설정 저장 (다크모드 등)</p>
              <p className="pl-4">• 임시 저장된 글 보관</p>
              <p className="pl-4">• 검색 기록 저장</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>8. 개인정보 보호책임자</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고,
              개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여
              아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
            </p>
            <div className="pl-4 space-y-2 mt-3">
              <p>• <strong>개인정보 보호책임자:</strong> 비유노트 팀</p>
              <p>• <strong>연락처:</strong> stillimproving0@gmail.com</p>
            </div>
            <p className="mt-4 text-muted-foreground text-xs">
              정보주체는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의,
              불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>9. 개인정보 처리방침 변경</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              이 개인정보 처리방침은 2025년 1월 1일부터 적용되며,
              법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
            <p className="mt-4 text-muted-foreground">
              <strong>공고일자:</strong> 2025년 1월 1일<br />
              <strong>시행일자:</strong> 2025년 1월 1일
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">중요 안내:</strong><br />
              비유노트는 개인 식별 정보(PII)나 민감한 데이터를 수집하거나
              저장하기 위한 플랫폼이 아닙니다. 서비스는 학습 커뮤니케이션을 위한
              것이며, 개인정보는 최소한으로만 수집됩니다. 민감한 개인정보를
              게시글이나 댓글에 작성하지 마십시오.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
