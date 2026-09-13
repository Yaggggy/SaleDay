import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Mail, RotateCw, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Spinner } from "@/components/ui/Basics";
import { Modal } from "@/components/ui/Modal";
import { apiErrorMessage } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useHasRole } from "@/hooks/useActiveMembership";
import { teamService } from "@/services";
import type { OrgRole } from "@/types";

const ROLES: OrgRole[] = ["VIEWER", "SELLER", "ADMIN", "OWNER"];

export function TeamPage() {
  const { activeOrgId, user } = useAuth();
  const canManage = useHasRole("ADMIN");
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("SELLER");

  const { data: members, isLoading } = useQuery({
    queryKey: ["members", activeOrgId],
    queryFn: () => teamService.listMembers(activeOrgId!),
    enabled: !!activeOrgId,
  });

  const { data: invitations } = useQuery({
    queryKey: ["invitations", activeOrgId],
    queryFn: () => teamService.listInvitations(activeOrgId!),
    enabled: !!activeOrgId && canManage,
  });

  const invite = useMutation({
    mutationFn: () => teamService.invite(activeOrgId!, email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", activeOrgId] });
      setShowInvite(false);
      setEmail("");
      toast.success(`Invitation sent to ${email}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: OrgRole }) => teamService.updateRole(activeOrgId!, memberId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", activeOrgId] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => teamService.removeMember(activeOrgId!, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", activeOrgId] });
      toast.success("Member removed.");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const resend = useMutation({
    mutationFn: (invitationId: string) => teamService.resendInvitation(activeOrgId!, invitationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", activeOrgId] });
      toast.success("Invitation email resent.");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) => teamService.revokeInvitation(activeOrgId!, invitationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", activeOrgId] });
      toast.success("Invitation revoked.");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Family Members</h1>
        {canManage && (
          <Button icon={UserPlus} onClick={() => setShowInvite(true)}>
            Invite
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="card divide-y divide-paper-line mb-6">
          {(members ?? []).map((m) => (
            <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-1.5">
                  {m.full_name} {m.role === "OWNER" && <Crown className="h-3.5 w-3.5 text-marigold-dark" />}
                </p>
                <p className="text-xs text-ink-faint truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.user_id !== user?.id ? (
                  <select
                    className="text-xs font-semibold border border-paper-line rounded-tag px-2 py-1.5 bg-white"
                    value={m.role}
                    onChange={(e) => updateRole.mutate({ memberId: m.id, role: e.target.value as OrgRole })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="price-tag text-[11px] status-reserved"
                    title={m.user_id === user?.id ? "You can't change your own role" : undefined}
                  >
                    {m.role}
                  </span>
                )}
                {canManage && m.user_id !== user?.id && (
                  <button onClick={() => remove.mutate(m.id)} className="text-ink-faint hover:text-tag p-1.5" aria-label="Remove member">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && invitations && invitations.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Pending Invitations</h2>
          <div className="card divide-y divide-paper-line">
            {invitations.map((inv) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-ink-faint shrink-0" />
                  <span className="truncate text-sm">{inv.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="price-tag text-[11px] status-reserved">{inv.status}</span>
                  {(inv.status === "PENDING" || inv.status === "EXPIRED") && (
                    <button
                      onClick={() => resend.mutate(inv.id)}
                      disabled={resend.isPending}
                      className="text-ink-faint hover:text-sky p-1.5 disabled:opacity-50"
                      aria-label="Resend invitation email"
                      title="Resend invitation email"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                  )}
                  {inv.status === "PENDING" && (
                    <button
                      onClick={() => revoke.mutate(inv.id)}
                      disabled={revoke.isPending}
                      className="text-ink-faint hover:text-tag p-1.5 disabled:opacity-50"
                      aria-label="Revoke invitation"
                      title="Revoke invitation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite a family member">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Email</label>
            <input required type="email" className="input mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input mt-1.5" value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={invite.isPending} className="w-full">
            Send Invitation
          </Button>
        </form>
      </Modal>
    </div>
  );
}
