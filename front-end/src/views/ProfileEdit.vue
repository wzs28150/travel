<template>
  <div class="page edit-page">
    <t-navbar title="编辑资料" left-arrow @left-click="goBack" />

    <div class="avatar-sec">
      <label class="avatar-label">
        <t-avatar :image="form.avatar" size="80px">
          <template v-if="!form.avatar">{{ (form.nickname || '旅').slice(0, 1) }}</template>
        </t-avatar>
        <div class="cam"><t-icon name="camera" size="16px" color="#fff" /></div>
        <input type="file" accept="image/*" hidden @change="onAvatar" />
      </label>
      <div class="avatar-tip">点击更换头像</div>
    </div>

    <t-cell-group theme="card" style="margin:0 12px;border-radius:14px;overflow:hidden">
      <t-input v-model="form.nickname" label="昵称" placeholder="请输入昵称" :maxlength="20" />
      <t-input v-model="form.signature" label="签名" placeholder="一句话介绍自己" :maxlength="40" />
      <t-cell title="性别" :note="form.gender" arrow @click="showGender = true" />
      <t-input v-model="form.city" label="城市" placeholder="所在城市" />
    </t-cell-group>

    <div class="save-bar">
      <t-button theme="primary" block size="large" :loading="saving" @click="save">保存</t-button>
    </div>

    <t-popup v-model="showGender" placement="bottom">
      <t-picker
        v-if="showGender"
        :value="genderVal"
        :columns="genderColumns"
        title="选择性别"
        confirm-btn="确定"
        cancel-btn="取消"
        @confirm="onGender"
        @cancel="showGender = false"
      />
    </t-popup>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useAuthStore } from '../stores/auth'
import { uploadFile } from '../api/http'

const auth = useAuthStore()
const router = useRouter()

const u = auth.user || {}
const form = reactive({
  nickname: u.nickname || '',
  signature: u.signature || '',
  gender: u.gender || '保密',
  city: u.city || '',
  avatar: u.avatar || '',
})

const saving = ref(false)
const showGender = ref(false)
const genderVal = ref([form.gender])
const genderColumns = [[{ label: '男', value: '男' }, { label: '女', value: '女' }, { label: '保密', value: '保密' }]]
function onGender(e) {
  form.gender = e.value && e.value[0] ? e.value[0] : form.gender
  showGender.value = false
}

async function onAvatar(e) {
  const f = e.target.files?.[0]
  if (!f) return
  try {
    const data = await uploadFile(f)
    form.avatar = data.url
    Toast({ message: '头像已上传', theme: 'success' })
  } catch (err) {
    Toast({ message: err.message || '头像上传失败', theme: 'error' })
  }
}

async function save() {
  if (!form.nickname.trim()) return Toast({ message: '请输入昵称', theme: 'warning' })
  saving.value = true
  try {
    await auth.updateProfile({
      nickname: form.nickname.trim(),
      signature: form.signature,
      gender: form.gender,
      city: form.city,
      avatar: form.avatar,
    })
    Toast({ message: '已保存', theme: 'success' })
    setTimeout(() => router.back(), 400)
  } catch (err) {
    Toast({ message: err.message || '保存失败', theme: 'error' })
  } finally {
    saving.value = false
  }
}
const goBack = () => router.back()
</script>

<style scoped>
.edit-page {
  padding-bottom: 0;
}
.avatar-sec {
  text-align: center;
  padding: 24px 0;
}
.avatar-label {
  display: inline-block;
  position: relative;
}
.cam {
  position: absolute;
  right: 0;
  bottom: 4px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}
.avatar-tip {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 8px;
}
.save-bar {
  padding: 24px 16px;
}
</style>
